import { Size } from 'aws-cdk-lib';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  SecurityGroup,
  Port,
  SubnetType,
  Vpc,
  InstanceType,
  LaunchTemplate,
  BlockDeviceVolume,
  UserData,
  EbsDeviceVolumeType,
} from 'aws-cdk-lib/aws-ec2';
import {
  AmiHardwareType,
  AsgCapacityProvider,
  AwsLogDriver,
  Cluster,
  ContainerImage,
  Ec2Service,
  Ec2TaskDefinition,
  EcsOptimizedImage,
  NetworkMode,
  ServiceManagedVolume,
  FileSystemType,
} from 'aws-cdk-lib/aws-ecs';
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  ListenerCertificate,
  Protocol,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { ARecord, IHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { LoadBalancerTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

interface ECSResourcesProps {
  vpc: Vpc;
  logLevel: string;
  loadBalancerSecurityGroup: SecurityGroup;
  certificate: Certificate;
  hostedZone: IHostedZone;
  hostName: string;
  model: string;
}

export class ECSResources extends Construct {
  ecsService: Ec2Service;
  applicationLoadBalancer: ApplicationLoadBalancer;

  constructor(scope: Construct, id: string, props: ECSResourcesProps) {
    super(scope, id);

    const hostedWhisperStreamingRole = new Role(
      this,
      'HostedWhisperStreamingRole',
      {
        assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            'service-role/AWSLambdaBasicExecutionRole',
          ),
        ],
      },
    );

    const ec2Role = new Role(this, 'ECSRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
    });

    this.applicationLoadBalancer = new ApplicationLoadBalancer(
      this,
      'applicationLoadBalancer',
      {
        vpc: props.vpc,
        vpcSubnets: { subnetType: SubnetType.PUBLIC },
        internetFacing: true,
        securityGroup: props.loadBalancerSecurityGroup,
      },
    );

    const ecsServiceSecurityGroup = new SecurityGroup(this, 'ecsServiceSG', {
      vpc: props.vpc,
    });

    const cluster = new Cluster(this, 'cluster', {
      vpc: props.vpc,
    });

    const launchTemplate = new LaunchTemplate(this, 'LaunchTemplate', {
      machineImage: EcsOptimizedImage.amazonLinux2(AmiHardwareType.GPU),
      instanceType: new InstanceType('g4dn.xlarge'),
      requireImdsv2: true,
      userData: UserData.forLinux(),
      securityGroup: ecsServiceSecurityGroup,
      role: ec2Role,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: BlockDeviceVolume.ebs(60),
        },
      ],
    });

    const autoScalingGroup = new AutoScalingGroup(this, 'AutoScalingGroup', {
      vpc: props.vpc,
      launchTemplate: launchTemplate,
      desiredCapacity: 1,
      minCapacity: 1,
      maxCapacity: 2,
      vpcSubnets: { subnetType: SubnetType.PUBLIC },
    });

    const capacityProvider = new AsgCapacityProvider(
      this,
      'AsgCapacityProvider',
      {
        autoScalingGroup,
      },
    );

    cluster.addAsgCapacityProvider(capacityProvider);

    const taskDefinition = new Ec2TaskDefinition(this, 'taskDefinition', {
      taskRole: hostedWhisperStreamingRole,
      networkMode: NetworkMode.BRIDGE,
    });

    const volume = new ServiceManagedVolume(this, 'RecordingsVolume', {
      name: 'recordings',
      managedEBSVolume: {
        size: Size.gibibytes(20), // Adjust size as needed
        volumeType: EbsDeviceVolumeType.GP3,
        fileSystemType: FileSystemType.XFS,
        encrypted: true, // Optional: Enable encryption
      },
    });

    taskDefinition.addVolume(volume);

    const container = taskDefinition.addContainer('HostedWhisperStreaming', {
      image: ContainerImage.fromAsset('src/resources/whisperServer'),
      environment: {
        LOG_LEVEL: props.logLevel,
        MODEL: props.model,
      },
      gpuCount: 1,
      memoryLimitMiB: 4096,
      cpu: 2048,
      portMappings: [
        { containerPort: 8765, hostPort: 8765 },
        { containerPort: 8080, hostPort: 8080 },
      ],
      logging: new AwsLogDriver({ streamPrefix: 'HostedWhisperStreaming' }),
    });

    volume.mountIn(container, {
      containerPath: '/app/recordings',
      readOnly: false,
    });

    this.ecsService = new Ec2Service(this, 'ECSService', {
      cluster: cluster,
      taskDefinition: taskDefinition,
      capacityProviderStrategies: [
        { capacityProvider: capacityProvider.capacityProviderName, weight: 1 },
      ],
    });

    this.ecsService.addVolume(volume);

    ecsServiceSecurityGroup.connections.allowFrom(
      props.loadBalancerSecurityGroup,
      Port.tcp(8765),
    );

    ecsServiceSecurityGroup.connections.allowFrom(
      props.loadBalancerSecurityGroup,
      Port.tcp(8080),
    );

    const whisperServerTargetGroup = new ApplicationTargetGroup(
      this,
      'whisperServerTargetGroup',
      {
        vpc: props.vpc,
        port: 8765,
        protocol: ApplicationProtocol.HTTP,
        targets: [
          this.ecsService.loadBalancerTarget({
            containerName: 'HostedWhisperStreaming',
            containerPort: 8765,
          }),
        ],
        healthCheck: {
          path: '/healthcheck',
          protocol: Protocol.HTTP,
          port: '8080',
        },
      },
    );

    this.applicationLoadBalancer.addListener('whisperListener', {
      port: 8765,
      protocol: ApplicationProtocol.HTTPS,
      certificates: [
        ListenerCertificate.fromCertificateManager(props.certificate),
      ],
      defaultTargetGroups: [whisperServerTargetGroup],
    });

    new ARecord(this, 'whisperARecord', {
      zone: props.hostedZone,
      recordName: props.hostName,
      target: RecordTarget.fromAlias(
        new LoadBalancerTarget(this.applicationLoadBalancer),
      ),
    });
  }
}
