import { App, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { config } from 'dotenv';
import {
  ECSResources,
  VPCResources,
  CertificateResources,
  AppRunnerResources,
} from '.';
config();

interface HostedWhisperStreamingProps extends StackProps {
  logLevel: string;
  domainName: string;
  hostName: string;
  model: string;
}

export class HostedWhisperStreamingWithClient extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: HostedWhisperStreamingProps,
  ) {
    super(scope, id, props);

    if (!props.domainName) {
      throw new Error('Domain Name is required');
    }
    if (!props.hostName) {
      throw new Error('Host Name is required');
    }

    if (props.model) {
      if (
        ![
          'tiny',
          'base',
          'small',
          'medium',
          'large',
          'tiny.en',
          'base.en',
          'small.en',
          'large.en',
          'techiaith/whisper-large-v3-ft-cy-ct2',
        ].includes(props.model)
      ) {
        throw new Error('Invalid model');
      }
    }

    const certificateResources = new CertificateResources(
      this,
      'CertificateResources',
      {
        domainName: props.domainName,
        hostName: props.hostName,
      },
    );
    const vpcResources = new VPCResources(this, 'VPCResources');
    new ECSResources(this, 'ECSResources', {
      vpc: vpcResources.vpc,
      loadBalancerSecurityGroup: vpcResources.loadBalancerSecurityGroup,
      logLevel: props.logLevel,
      certificate: certificateResources.certificate,
      hostedZone: certificateResources.hostedZone,
      model: props.model,
      hostName: props.hostName,
    });

    const appRunnerResources = new AppRunnerResources(
      this,
      'AppRunnerResources',
      {
        whisperServerHost: `${props.hostName}.${props.domainName}`,
        whisperServerPort: '8765',
      },
    );

    new CfnOutput(this, 'AppRunnerServiceUrl', {
      value: appRunnerResources.appRunnerService.attrServiceUrl,
      description: 'URL of the App Runner service',
    });
  }
}

const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'us-east-1',
};

const stackProps = {
  logLevel: process.env.LOG_LEVEL || 'INFO',
  model: process.env.MODEL || 'base',
  domainName: process.env.DOMAIN_NAME || '',
  hostName: process.env.HOST_NAME || '',
};

const app = new App();

new HostedWhisperStreamingWithClient(app, 'HostedWhisperStreamingWithClient', {
  ...stackProps,
  env: devEnv,
});

app.synth();
