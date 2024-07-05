import * as path from 'path';
import * as apprunner from 'aws-cdk-lib/aws-apprunner';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface AppRunnerResourcesProps {
  whisperServerHost: string;
  whisperServerPort: string;
}

export class AppRunnerResources extends Construct {
  appRunnerService: apprunner.CfnService;

  constructor(scope: Construct, id: string, props: AppRunnerResourcesProps) {
    super(scope, id);

    const imageAsset = new DockerImageAsset(this, 'NextJsAppImage', {
      directory: path.join(__dirname, './resources/clientApplication'),
      file: 'Dockerfile',
      buildArgs: {
        NEXT_PUBLIC_WHISPER_SERVER_HOST: props.whisperServerHost,
        NEXT_PUBLIC_WHISPER_SERVER_PORT: props.whisperServerPort,
      },
    });

    // Create an IAM role for App Runner to access ECR
    const appRunnerRole = new Role(this, 'AppRunnerECRAccessRole', {
      assumedBy: new ServicePrincipal('build.apprunner.amazonaws.com'),
    });
    imageAsset.repository.grantPull(appRunnerRole);

    const instanceRole = new Role(this, 'AppRunnerInstanceRole', {
      assumedBy: new ServicePrincipal('tasks.apprunner.amazonaws.com'),
    });
    instanceRole.addToPolicy(
      new PolicyStatement({
        actions: [
          'chime:CreateMeeting',
          'chime:CreateAttendee',
          'chime:DeleteMeeting',
        ],
        resources: ['*'],
      }),
    );

    instanceRole.addToPolicy(
      new PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }),
    );

    this.appRunnerService = new apprunner.CfnService(
      this,
      'NextJsAppRunnerService',
      {
        sourceConfiguration: {
          imageRepository: {
            imageIdentifier: imageAsset.imageUri,
            imageRepositoryType: 'ECR',
            imageConfiguration: {
              port: '3000',
              runtimeEnvironmentVariables: [
                {
                  name: 'NEXT_PUBLIC_WHISPER_SERVER_HOST',
                  value: props.whisperServerHost,
                },
                {
                  name: 'NEXT_PUBLIC_WHISPER_SERVER_PORT',
                  value: props.whisperServerPort,
                },
              ],
            },
          },
          autoDeploymentsEnabled: true,
          authenticationConfiguration: {
            accessRoleArn: appRunnerRole.roleArn,
          },
        },
        instanceConfiguration: {
          instanceRoleArn: instanceRole.roleArn,
        },
      },
    );
  }
}
