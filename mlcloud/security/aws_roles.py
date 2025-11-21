"""AWS IAM role templates for least-privilege access."""

from typing import Dict, Any


def create_aws_role_template() -> Dict[str, Any]:
    """Create minimal IAM policy document for mlcloud CVAT deployments.
    
    Returns:
        IAM policy document dictionary
    """
    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "ec2:RunInstances",
                    "ec2:TerminateInstances",
                    "ec2:StartInstances",
                    "ec2:StopInstances",
                    "ec2:DescribeInstances",
                    "ec2:DescribeImages",
                    "ec2:DescribeInstanceTypes",
                    "ec2:DescribeSecurityGroups",
                    "ec2:DescribeSubnets",
                    "ec2:DescribeVpcs",
                    "ec2:CreateTags",
                    "ec2:DescribeTags",
                    "ec2:AllocateAddress",
                    "ec2:AssociateAddress",
                    "ec2:DescribeAddresses",
                    "ec2:ReleaseAddress",
                ],
                "Resource": "*",
                "Condition": {
                    "StringEquals": {
                        "ec2:ResourceTag/CreatedBy": "mlcloud",
                    }
                },
            },
            {
                "Effect": "Allow",
                "Action": [
                    "elasticfilesystem:CreateFileSystem",
                    "elasticfilesystem:DescribeFileSystems",
                    "elasticfilesystem:CreateMountTarget",
                    "elasticfilesystem:DescribeMountTargets",
                    "elasticfilesystem:DeleteFileSystem",
                    "elasticfilesystem:DeleteMountTarget",
                    "elasticfilesystem:CreateTags",
                    "elasticfilesystem:DescribeTags",
                ],
                "Resource": "*",
                "Condition": {
                    "StringEquals": {
                        "elasticfilesystem:ResourceTag/CreatedBy": "mlcloud",
                    }
                },
            },
            {
                "Effect": "Allow",
                "Action": [
                    "elasticloadbalancing:CreateLoadBalancer",
                    "elasticloadbalancing:DescribeLoadBalancers",
                    "elasticloadbalancing:DeleteLoadBalancer",
                    "elasticloadbalancing:CreateListener",
                    "elasticloadbalancing:DescribeListeners",
                    "elasticloadbalancing:DeleteListener",
                    "elasticloadbalancing:CreateTargetGroup",
                    "elasticloadbalancing:DescribeTargetGroups",
                    "elasticloadbalancing:DeleteTargetGroup",
                    "elasticloadbalancing:RegisterTargets",
                    "elasticloadbalancing:DeregisterTargets",
                    "elasticloadbalancing:AddTags",
                    "elasticloadbalancing:DescribeTags",
                ],
                "Resource": "*",
                "Condition": {
                    "StringEquals": {
                        "elasticloadbalancing:ResourceTag/CreatedBy": "mlcloud",
                    }
                },
            },
            {
                "Effect": "Allow",
                "Action": [
                    "acm:RequestCertificate",
                    "acm:DescribeCertificate",
                    "acm:ListCertificates",
                    "acm:DeleteCertificate",
                    "acm:AddTagsToCertificate",
                ],
                "Resource": "*",
                "Condition": {
                    "StringEquals": {
                        "acm:ResourceTag/CreatedBy": "mlcloud",
                    }
                },
            },
            {
                "Effect": "Allow",
                "Action": [
                    "route53:ChangeResourceRecordSets",
                    "route53:GetChange",
                    "route53:ListResourceRecordSets",
                    "route53:ListHostedZones",
                ],
                "Resource": "*",
            },
            {
                "Effect": "Allow",
                "Action": [
                    "iam:PassRole",
                    "iam:GetRole",
                    "iam:CreateRole",
                    "iam:PutRolePolicy",
                    "iam:AttachRolePolicy",
                    "iam:ListRolePolicies",
                    "iam:ListAttachedRolePolicies",
                ],
                "Resource": "arn:aws:iam::*:role/mlcloud-*",
            },
            {
                "Effect": "Allow",
                "Action": [
                    "ssm:SendCommand",
                    "ssm:ListCommandInvocations",
                    "ssm:DescribeInstanceInformation",
                ],
                "Resource": "*",
            },
        ],
    }

