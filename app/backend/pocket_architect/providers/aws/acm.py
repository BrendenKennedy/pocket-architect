"""
AWS ACM provider for managing SSL/TLS certificates.
"""

from typing import List, Dict, Optional
from botocore.exceptions import ClientError

from pocket_architect.providers.aws.client import AWSClient, handle_aws_error
from pocket_architect.utils.logger import setup_logger

logger = setup_logger(__name__)


class ACMProvider:
    """AWS ACM operations provider."""

    def __init__(self, client: AWSClient):
        """
        Initialize ACM provider.

        Args:
            client: AWSClient instance
        """
        self.client = client
        self.acm = client.acm

    @handle_aws_error
    def request_certificate(
        self,
        domain_name: str,
        subject_alternative_names: Optional[List[str]] = None,
        validation_method: str = "DNS",
        key_algorithm: str = "RSA_2048",
        tags: Optional[List[Dict[str, str]]] = None,
    ) -> Dict:
        """
        Request a new SSL/TLS certificate.

        Args:
            domain_name: Primary domain name
            subject_alternative_names: Additional domain names
            validation_method: Validation method ('DNS' or 'EMAIL')
            key_algorithm: Key algorithm ('RSA_2048', 'RSA_4096', 'EC_prime256v1', 'EC_secp384r1')
            tags: Tags for the certificate

        Returns:
            Certificate request information
        """
        logger.info(f"Requesting certificate for domain: {domain_name}")

        params = {
            "DomainName": domain_name,
            "ValidationMethod": validation_method.upper(),
            "KeyAlgorithm": key_algorithm,
        }

        if subject_alternative_names:
            params["SubjectAlternativeNames"] = subject_alternative_names

        if tags:
            params["Tags"] = [{"Key": k, "Value": v} for k, v in tags.items()]

        response = self.acm.request_certificate(**params)

        logger.info(f"Requested certificate: {response['CertificateArn']}")
        return {
            "certificate_arn": response["CertificateArn"],
            "domain_name": domain_name,
            "subject_alternative_names": subject_alternative_names or [],
            "validation_method": validation_method,
            "key_algorithm": key_algorithm,
        }

    @handle_aws_error
    def describe_certificate(self, certificate_arn: str) -> Optional[Dict]:
        """
        Describe a certificate.

        Args:
            certificate_arn: ARN of the certificate

        Returns:
            Certificate information or None if not found
        """
        try:
            response = self.acm.describe_certificate(CertificateArn=certificate_arn)
            cert = response["Certificate"]

            return {
                "certificate_arn": cert["CertificateArn"],
                "domain_name": cert["DomainName"],
                "subject_alternative_names": cert.get("SubjectAlternativeNames", []),
                "status": cert["Status"],
                "type": cert.get("Type", "AMAZON_ISSUED"),
                "key_algorithm": cert.get("KeyAlgorithm"),
                "serial": cert.get("Serial"),
                "subject": cert.get("Subject"),
                "issuer": cert.get("Issuer"),
                "not_before": cert.get("NotBefore").isoformat()
                if cert.get("NotBefore")
                else None,
                "not_after": cert.get("NotAfter").isoformat()
                if cert.get("NotAfter")
                else None,
                "created_at": cert.get("CreatedAt").isoformat()
                if cert.get("CreatedAt")
                else None,
                "failure_reason": cert.get("FailureReason"),
                "validation_method": cert.get("ValidationMethod"),
                "domain_validation_options": cert.get("DomainValidationOptions", []),
                "renewal_eligibility": cert.get("RenewalEligibility"),
                "tags": cert.get("Tags", []),
            }
        except ClientError as e:
            if e.response["Error"]["Code"] == "ResourceNotFoundException":
                logger.warning(f"Certificate {certificate_arn} not found")
                return None
            raise

    @handle_aws_error
    def list_certificates(
        self, statuses: Optional[List[str]] = None, max_items: int = 100
    ) -> List[Dict]:
        """
        List certificates.

        Args:
            statuses: Optional list of certificate statuses to filter by
            max_items: Maximum number of certificates to return

        Returns:
            List of certificate summaries
        """
        kwargs = {"MaxItems": max_items}
        if statuses:
            kwargs["CertificateStatuses"] = statuses

        response = self.acm.list_certificates(**kwargs)

        certificates = []
        for cert in response.get("CertificateSummaryList", []):
            certificates.append(
                {
                    "certificate_arn": cert["CertificateArn"],
                    "domain_name": cert["DomainName"],
                    "status": cert["Status"],
                    "type": cert.get("Type", "AMAZON_ISSUED"),
                    "key_algorithm": cert.get("KeyAlgorithm"),
                    "created_at": cert.get("CreatedAt").isoformat()
                    if cert.get("CreatedAt")
                    else None,
                    "has_additional_subject_alternative_names": cert.get(
                        "HasAdditionalSubjectAlternativeNames", False
                    ),
                }
            )

        logger.info(f"Listed {len(certificates)} certificates")
        return certificates

    @handle_aws_error
    def delete_certificate(self, certificate_arn: str) -> None:
        """
        Delete a certificate.

        Args:
            certificate_arn: ARN of the certificate to delete
        """
        logger.info(f"Deleting certificate: {certificate_arn}")
        self.acm.delete_certificate(CertificateArn=certificate_arn)
        logger.info(f"Deleted certificate: {certificate_arn}")

    @handle_aws_error
    def resend_validation_email(
        self, certificate_arn: str, domain: str, validation_domain: str
    ) -> None:
        """
        Resend validation email for a certificate.

        Args:
            certificate_arn: ARN of the certificate
            domain: Domain to validate
            validation_domain: Domain to send validation email to
        """
        logger.info(f"Resending validation email for certificate: {certificate_arn}")
        self.acm.resend_validation_email(
            CertificateArn=certificate_arn,
            Domain=domain,
            ValidationDomain=validation_domain,
        )
        logger.info(f"Resent validation email for certificate: {certificate_arn}")
