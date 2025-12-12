"""
Security service for managing AWS security resources.
Coordinates between AWS providers and local database.
"""

from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from pocket_architect.core.models import (
    CreateKeyPairRequest,
    CreateSecurityGroupRequest,
    CreateIAMRoleRequest,
    CreateCertificateRequest,
)
from pocket_architect.db.models import (
    KeyPairDB,
    SecurityGroupDB,
    IAMRoleDB,
    CertificateDB,
)
from pocket_architect.providers.aws import AWSProvider
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class SecurityService:
    """Service for managing security resources."""

    def __init__(self, aws_provider: AWSProvider, db_session: Session):
        """
        Initialize security service.

        Args:
            aws_provider: AWS provider instance
            db_session: Database session
        """
        self.aws = aws_provider
        self.db = db_session

    # ========================================================================
    # SSH Key Pairs
    # ========================================================================

    def list_key_pairs(self) -> List[Dict[str, Any]]:
        """
        List SSH key pairs from AWS and enrich with local data.

        Returns:
            List of key pair dictionaries
        """
        logger.info("Listing SSH key pairs")

        # Get key pairs from AWS
        aws_key_pairs = self.aws.ec2.describe_key_pairs()

        # Get key pairs from local database
        local_key_pairs = {kp.name: kp for kp in self.db.query(KeyPairDB).all()}

        # Merge AWS data with local data
        key_pairs = []
        for aws_kp in aws_key_pairs:
            name = aws_kp["key_name"]
            local_kp = local_key_pairs.get(name)

            if local_kp:
                # Key pair exists in our database
                key_pair = self._merge_aws_and_local_key_pair(aws_kp, local_kp)
            else:
                # Key pair not in our database
                key_pair = self._aws_key_pair_to_dict(aws_kp)

            key_pairs.append(key_pair)

        logger.info(f"Found {len(key_pairs)} key pairs")
        return key_pairs

    def create_key_pair(self, request: CreateKeyPairRequest) -> Dict[str, Any]:
        """
        Create a new SSH key pair.

        Args:
            request: Key pair creation request

        Returns:
            Created key pair dictionary
        """
        logger.info(f"Creating SSH key pair: {request.name}")

        # Create key pair in AWS
        aws_key_pair = self.aws.ec2.create_key_pair(
            key_name=request.name, key_type=request.keyType
        )

        # Save to local database
        key_pair_db = KeyPairDB(
            name=request.name,
            description=request.description or "",
            key_type=request.keyType,
            fingerprint=aws_key_pair["key_fingerprint"],
            private_key_path="",  # Will be set when downloaded
            created=datetime.utcnow(),
        )

        self.db.add(key_pair_db)
        self.db.commit()
        self.db.refresh(key_pair_db)

        logger.info(f"SSH key pair created with ID: {key_pair_db.id}")

        return self._merge_aws_and_local_key_pair(aws_key_pair, key_pair_db)

    def delete_key_pair(self, key_name: str) -> None:
        """
        Delete an SSH key pair.

        Args:
            key_name: Name of the key pair to delete
        """
        logger.info(f"Deleting SSH key pair: {key_name}")

        # Delete from AWS
        self.aws.ec2.delete_key_pair(key_name)

        # Delete from database
        key_pair_db = (
            self.db.query(KeyPairDB).filter(KeyPairDB.name == key_name).first()
        )
        if key_pair_db:
            self.db.delete(key_pair_db)
            self.db.commit()

        logger.info(f"SSH key pair {key_name} deleted")

    # ========================================================================
    # Security Groups
    # ========================================================================

    def list_security_groups(self) -> List[Dict[str, Any]]:
        """
        List security groups from AWS and enrich with local data.

        Returns:
            List of security group dictionaries
        """
        logger.info("Listing security groups")

        # Get security groups from AWS
        aws_security_groups = self.aws.ec2.describe_security_groups()

        # Get security groups from local database
        local_security_groups = {
            sg.group_id: sg for sg in self.db.query(SecurityGroupDB).all()
        }

        # Merge AWS data with local data
        security_groups = []
        for aws_sg in aws_security_groups:
            group_id = aws_sg["group_id"]
            local_sg = local_security_groups.get(group_id)

            if local_sg:
                # Security group exists in our database
                security_group = self._merge_aws_and_local_security_group(
                    aws_sg, local_sg
                )
            else:
                # Security group not in our database
                security_group = self._aws_security_group_to_dict(aws_sg)

            security_groups.append(security_group)

        logger.info(f"Found {len(security_groups)} security groups")
        return security_groups

    def create_security_group(
        self, request: CreateSecurityGroupRequest
    ) -> Dict[str, Any]:
        """
        Create a new security group.

        Args:
            request: Security group creation request

        Returns:
            Created security group dictionary
        """
        logger.info(f"Creating security group: {request.name}")

        # Create security group in AWS
        aws_security_group = self.aws.ec2.create_security_group(
            group_name=request.name,
            description=request.description,
            vpc_id=request.vpcId,
        )

        # Add rules if provided
        if request.inboundRules:
            self.aws.ec2.authorize_security_group_ingress(
                group_id=aws_security_group["group_id"],
                ip_permissions=request.inboundRules,
            )

        if request.outboundRules:
            self.aws.ec2.authorize_security_group_egress(
                group_id=aws_security_group["group_id"],
                ip_permissions=request.outboundRules,
            )

        # Save to local database
        security_group_db = SecurityGroupDB(
            group_id=aws_security_group["group_id"],
            name=request.name,
            description=request.description,
            vpc_id=request.vpcId or "",
            inbound_rules=request.inboundRules or [],
            outbound_rules=request.outboundRules or [],
            created=datetime.utcnow(),
        )

        self.db.add(security_group_db)
        self.db.commit()
        self.db.refresh(security_group_db)

        logger.info(f"Security group created with ID: {security_group_db.id}")

        # Get updated AWS data
        aws_sg_updated = self.aws.ec2.describe_security_groups(
            group_ids=[aws_security_group["group_id"]]
        )[0]

        return self._merge_aws_and_local_security_group(
            aws_sg_updated, security_group_db
        )

    def delete_security_group(self, group_id: str) -> None:
        """
        Delete a security group.

        Args:
            group_id: Security group ID to delete
        """
        logger.info(f"Deleting security group: {group_id}")

        # Delete from AWS
        self.aws.ec2.delete_security_group(group_id)

        # Delete from database
        security_group_db = (
            self.db.query(SecurityGroupDB)
            .filter(SecurityGroupDB.group_id == group_id)
            .first()
        )
        if security_group_db:
            self.db.delete(security_group_db)
            self.db.commit()

        logger.info(f"Security group {group_id} deleted")

    # ========================================================================
    # IAM Roles
    # ========================================================================

    def list_iam_roles(self) -> List[Dict[str, Any]]:
        """
        List IAM roles from AWS and enrich with local data.

        Returns:
            List of IAM role dictionaries
        """
        logger.info("Listing IAM roles")

        # Get roles from AWS
        aws_roles = self.aws.iam.list_roles()

        # Get roles from local database
        local_roles = {role.name: role for role in self.db.query(IAMRoleDB).all()}

        # Merge AWS data with local data
        roles = []
        for aws_role in aws_roles:
            name = aws_role["role_name"]
            local_role = local_roles.get(name)

            if local_role:
                # Role exists in our database
                role = self._merge_aws_and_local_iam_role(aws_role, local_role)
            else:
                # Role not in our database
                role = self._aws_iam_role_to_dict(aws_role)

            roles.append(role)

        logger.info(f"Found {len(roles)} IAM roles")
        return roles

    def create_iam_role(self, request: CreateIAMRoleRequest) -> Dict[str, Any]:
        """
        Create a new IAM role.

        Args:
            request: IAM role creation request

        Returns:
            Created IAM role dictionary
        """
        logger.info(f"Creating IAM role: {request.name}")

        # Create role in AWS
        aws_role = self.aws.iam.create_role(
            role_name=request.name,
            assume_role_policy_document=request.trustPolicy,
            description=request.description,
        )

        # Attach managed policies
        for policy_arn in request.managedPolicies or []:
            self.aws.iam.attach_role_policy(request.name, policy_arn)

        # Add inline policy if provided
        if request.inlinePolicy:
            self.aws.iam.put_role_policy(
                role_name=request.name,
                policy_name=f"{request.name}-inline-policy",
                policy_document=request.inlinePolicy,
            )

        # Save to local database
        iam_role_db = IAMRoleDB(
            name=request.name,
            description=request.description or "",
            trust_policy=request.trustPolicy,
            managed_policies=request.managedPolicies or [],
            inline_policy=request.inlinePolicy or "",
            arn=aws_role["arn"],
            created=datetime.utcnow(),
        )

        self.db.add(iam_role_db)
        self.db.commit()
        self.db.refresh(iam_role_db)

        logger.info(f"IAM role created with ID: {iam_role_db.id}")

        return self._merge_aws_and_local_iam_role(aws_role, iam_role_db)

    def delete_iam_role(self, role_name: str) -> None:
        """
        Delete an IAM role.

        Args:
            role_name: Name of the role to delete
        """
        logger.info(f"Deleting IAM role: {role_name}")

        # Detach all managed policies
        attached_policies = self.aws.iam.list_attached_role_policies(role_name)
        for policy in attached_policies:
            self.aws.iam.detach_role_policy(role_name, policy["policy_arn"])

        # Delete all inline policies
        inline_policies = self.aws.iam.list_role_policies(role_name)
        for policy_name in inline_policies:
            self.aws.iam.delete_role_policy(role_name, policy_name)

        # Delete from AWS
        self.aws.iam.delete_role(role_name)

        # Delete from database
        iam_role_db = (
            self.db.query(IAMRoleDB).filter(IAMRoleDB.name == role_name).first()
        )
        if iam_role_db:
            self.db.delete(iam_role_db)
            self.db.commit()

        logger.info(f"IAM role {role_name} deleted")

    # ========================================================================
    # Certificates
    # ========================================================================

    def list_certificates(self) -> List[Dict[str, Any]]:
        """
        List certificates from AWS and enrich with local data.

        Returns:
            List of certificate dictionaries
        """
        logger.info("Listing certificates")

        # Get certificates from AWS
        aws_certificates = self.aws.acm.list_certificates()

        # Get certificates from local database
        local_certificates = {
            cert.arn: cert for cert in self.db.query(CertificateDB).all()
        }

        # Merge AWS data with local data
        certificates = []
        for aws_cert in aws_certificates:
            arn = aws_cert["certificate_arn"]
            local_cert = local_certificates.get(arn)

            if local_cert:
                # Certificate exists in our database
                certificate = self._merge_aws_and_local_certificate(
                    aws_cert, local_cert
                )
            else:
                # Certificate not in our database
                certificate = self._aws_certificate_to_dict(aws_cert)

            certificates.append(certificate)

        logger.info(f"Found {len(certificates)} certificates")
        return certificates

    def create_certificate(self, request: CreateCertificateRequest) -> Dict[str, Any]:
        """
        Request a new SSL/TLS certificate.

        Args:
            request: Certificate creation request

        Returns:
            Created certificate dictionary
        """
        logger.info(f"Requesting certificate for domain: {request.domain}")

        # Request certificate in AWS
        aws_certificate = self.aws.acm.request_certificate(
            domain_name=request.domain,
            subject_alternative_names=request.additionalDomains,
            validation_method=request.validationMethod,
        )

        # Save to local database
        certificate_db = CertificateDB(
            arn=aws_certificate["certificate_arn"],
            domain=request.domain,
            additional_domains=request.additionalDomains or [],
            validation_method=request.validationMethod,
            status="PENDING_VALIDATION",
            created=datetime.utcnow(),
        )

        self.db.add(certificate_db)
        self.db.commit()
        self.db.refresh(certificate_db)

        logger.info(f"Certificate requested with ID: {certificate_db.id}")

        # Get detailed certificate info
        detailed_cert = self.aws.acm.describe_certificate(
            aws_certificate["certificate_arn"]
        )
        if detailed_cert:
            return self._merge_aws_and_local_certificate(
                self._detailed_cert_to_summary(detailed_cert), certificate_db
            )

        return self._merge_aws_and_local_certificate(aws_certificate, certificate_db)

    def delete_certificate(self, certificate_arn: str) -> None:
        """
        Delete a certificate.

        Args:
            certificate_arn: ARN of the certificate to delete
        """
        logger.info(f"Deleting certificate: {certificate_arn}")

        # Delete from AWS
        self.aws.acm.delete_certificate(certificate_arn)

        # Delete from database
        certificate_db = (
            self.db.query(CertificateDB)
            .filter(CertificateDB.arn == certificate_arn)
            .first()
        )
        if certificate_db:
            self.db.delete(certificate_db)
            self.db.commit()

        logger.info(f"Certificate {certificate_arn} deleted")

    # ========================================================================
    # Helper Methods
    # ========================================================================

    def _aws_key_pair_to_dict(self, aws_kp: Dict) -> Dict[str, Any]:
        """Convert AWS key pair to dict."""
        return {
            "id": 0,
            "name": aws_kp["key_name"],
            "fingerprint": aws_kp["key_fingerprint"],
            "type": aws_kp["key_type"],
            "created": datetime.utcnow().isoformat(),
            "usedIn": [],
        }

    def _merge_aws_and_local_key_pair(
        self, aws_kp: Dict, local_kp: KeyPairDB
    ) -> Dict[str, Any]:
        """Merge AWS and local key pair data."""
        return {
            "id": local_kp.id,
            "name": local_kp.name,
            "description": local_kp.description,
            "fingerprint": aws_kp["key_fingerprint"],
            "type": local_kp.key_type,
            "created": local_kp.created.isoformat(),
            "usedIn": [],  # TODO: Implement usage tracking
        }

    def _aws_security_group_to_dict(self, aws_sg: Dict) -> Dict[str, Any]:
        """Convert AWS security group to dict."""
        return {
            "id": 0,
            "name": aws_sg["group_name"],
            "description": aws_sg["description"],
            "vpcId": aws_sg["vpc_id"] or "",
            "ingressRules": len(aws_sg["ip_permissions"]),
            "egressRules": len(aws_sg["ip_permissions_egress"]),
        }

    def _merge_aws_and_local_security_group(
        self, aws_sg: Dict, local_sg: SecurityGroupDB
    ) -> Dict[str, Any]:
        """Merge AWS and local security group data."""
        return {
            "id": local_sg.id,
            "groupId": aws_sg["group_id"],
            "name": local_sg.name,
            "description": local_sg.description,
            "vpcId": aws_sg["vpc_id"] or "",
            "ingressRules": len(aws_sg["ip_permissions"]),
            "egressRules": len(aws_sg["ip_permissions_egress"]),
            "created": local_sg.created.isoformat(),
        }

    def _aws_iam_role_to_dict(self, aws_role: Dict) -> Dict[str, Any]:
        """Convert AWS IAM role to dict."""
        return {
            "id": 0,
            "name": aws_role["role_name"],
            "description": "",
            "trustPolicy": "unknown",
            "policyCount": 0,
            "arn": aws_role["arn"],
            "created": aws_role["create_date"],
        }

    def _merge_aws_and_local_iam_role(
        self, aws_role: Dict, local_role: IAMRoleDB
    ) -> Dict[str, Any]:
        """Merge AWS and local IAM role data."""
        return {
            "id": local_role.id,
            "name": local_role.name,
            "description": local_role.description,
            "trustPolicy": local_role.trust_policy,
            "policyCount": len(local_role.managed_policies),
            "arn": aws_role["arn"],
            "created": local_role.created.isoformat(),
        }

    def _aws_certificate_to_dict(self, aws_cert: Dict) -> Dict[str, Any]:
        """Convert AWS certificate to dict."""
        return {
            "id": 0,
            "domain": aws_cert["domain_name"],
            "status": aws_cert["status"],
            "type": aws_cert["type"],
            "expiration": None,
            "arn": aws_cert["certificate_arn"],
        }

    def _merge_aws_and_local_certificate(
        self, aws_cert: Dict, local_cert: CertificateDB
    ) -> Dict[str, Any]:
        """Merge AWS and local certificate data."""
        return {
            "id": local_cert.id,
            "domain": local_cert.domain,
            "status": aws_cert.get("status", local_cert.status),
            "type": aws_cert.get("type", "AMAZON_ISSUED"),
            "expiration": aws_cert.get("not_after"),
            "arn": local_cert.arn,
            "created": local_cert.created.isoformat(),
        }

    def _detailed_cert_to_summary(self, detailed_cert: Dict) -> Dict[str, Any]:
        """Convert detailed certificate to summary format."""
        cert = detailed_cert["certificate"]
        return {
            "certificate_arn": cert["CertificateArn"],
            "domain_name": cert["DomainName"],
            "status": cert["Status"],
            "type": cert.get("Type", "AMAZON_ISSUED"),
            "key_algorithm": cert.get("KeyAlgorithm"),
            "created_at": cert.get("CreatedAt").isoformat()
            if cert.get("CreatedAt")
            else None,
            "not_after": cert.get("NotAfter").isoformat()
            if cert.get("NotAfter")
            else None,
        }
