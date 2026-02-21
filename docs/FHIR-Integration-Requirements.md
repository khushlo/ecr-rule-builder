# FHIR Integration Requirements Guide

## Overview

This guide outlines the technical requirements and information needed from EHR vendors and healthcare organizations to successfully integrate their FHIR R4 endpoints with the ECR Rule Builder system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Required Information by EHR Vendor](#required-information-by-ehr-vendor)
- [Authentication Methods](#authentication-methods)
- [Network and Security Requirements](#network-and-security-requirements)
- [Testing and Validation](#testing-and-validation)
- [Common Integration Scenarios](#common-integration-scenarios)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### FHIR Compliance
- **FHIR Version**: R4 (4.0.1 or later)
- **Required Resources**: Patient, Condition, Observation, Encounter
- **Search Parameters**: Must support standard search parameters for above resources
- **Capability Statement**: Must provide a FHIR capability statement at `/metadata`

### Network Access
- **Internet Connectivity**: Required for cloud deployments
- **Firewall Configuration**: Allow outbound HTTPS (port 443) from ECR server to FHIR endpoints
- **SSL/TLS**: TLS 1.2 or higher required

---

## Required Information by EHR Vendor

### 🏥 **Epic (Epic Systems)**

#### Information Required:
1. **FHIR Base URL**
   - Format: `https://[domain]/interconnect-fhir-oauth/api/FHIR/R4`
   - Example: `https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4`

2. **OAuth 2.0 Credentials**
   - **Client ID**: Provided by Epic after app registration
   - **Client Secret**: Provided by Epic (for backend services)
   - **Scope**: Usually `system/Patient.read system/Condition.read system/Observation.read`

3. **Epic App Registration**
   - Register app in Epic's App Orchard or MyChart
   - Request SMART on FHIR backend services scope
   - Obtain production credentials

#### Setup Steps:
1. Contact Epic technical team or use Epic's Developer Portal
2. Complete Epic's SMART on FHIR application form
3. Provide ECR Rule Builder app details and use case
4. Undergo Epic's review and approval process
5. Receive production client credentials

---

### 🏥 **Cerner/Oracle Health**

#### Information Required:
1. **FHIR Base URL**
   - Format: `https://fhir-ehr-code.cerner.com/r4/[tenant-id]`
   - Example: `https://fhir-ehr-code.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d`

2. **OAuth 2.0 Credentials**
   - **Client ID**: Obtained from Cerner SMART on FHIR registration
   - **Client Secret**: For system/backend access
   - **Tenant ID**: Unique identifier for the healthcare organization

3. **Cerner Code Console Registration**
   - Register in Cerner's Code Console
   - Request appropriate FHIR scopes

#### Setup Steps:
1. Access Cerner's Code Console (https://code.cerner.com/)
2. Create new SMART on FHIR application
3. Request system scopes for backend access
4. Obtain tenant-specific FHIR endpoint
5. Get client credentials for production use

---

### 🏥 **Paragon (McKesson)**

#### Information Required:
1. **FHIR Base URL**
   - Format: `https://[hospital-domain]/fhir/R4`
   - Example: `https://your-hospital.paragon.com/fhir/R4`

2. **Authentication Method** (varies by installation)
   - **Basic Auth**: Username/password
   - **API Key**: Bearer token
   - **OAuth**: Client credentials

3. **Network Information**
   - **Server hostname/IP**
   - **Port** (usually 443 for HTTPS)
   - **VPN requirements** (if on-premises)

#### Setup Steps:
1. Contact McKesson Paragon support team
2. Request FHIR API access for ECR integration
3. Provide use case and data requirements
4. Receive endpoint configuration and credentials
5. Configure network access (VPN if required)

---

### 🏥 **eClinicalWorks (eCW)**

#### Information Required:
1. **FHIR Base URL**
   - Format: `https://[practice-url]/fhir/R4`
   - Example: `https://your-practice.ecwcloud.com/fhir/R4`

2. **API Credentials**
   - **API Token**: Bearer token for authentication
   - **Practice ID**: Identifier for the specific practice
   - **User credentials**: For initial token generation

#### Setup Steps:
1. Contact eClinicalWorks integration team
2. Request FHIR API access for your practice
3. Provide ECR use case documentation
4. Receive API token and endpoint information
5. Test connectivity and data access

---

### 🏥 **athenahealth**

#### Information Required:
1. **FHIR Base URL**
   - Format: `https://api.athenahealth.com/fhir/r4`
   - Athena uses a centralized FHIR endpoint

2. **OAuth 2.0 Credentials**
   - **Client ID**: From athenahealth developer portal
   - **Client Secret**: For backend services
   - **Practice Groups**: Access to specific practices

#### Setup Steps:
1. Register in athenahealth Developer Portal
2. Request FHIR API access for ECR
3. Specify required practice groups
4. Obtain OAuth credentials
5. Configure practice-specific access

---

### 🏥 **NextGen Healthcare**

#### Information Required:
1. **FHIR Base URL**
   - Format: `https://[server]/NextGenPlatform/fhir/R4`
   - May vary based on installation

2. **Authentication**
   - **Basic Authentication**: Username/password
   - **Client certificates**: For enhanced security
   - **API Keys**: If available

#### Setup Steps:
1. Contact NextGen technical support
2. Request FHIR API enablement
3. Provide integration requirements
4. Receive server details and credentials
5. Configure secure authentication

---

### 🏥 **MEDITECH**

#### Information Required:
1. **FHIR Base URL**
   - Format: `https://[hospital-server]/fhir/R4`
   - Example: `https://fhir.hospital.org/fhir/R4`

2. **Authentication**
   - **OAuth 2.0**: Preferred method
   - **Basic Auth**: Alternative option
   - **Custom authentication**: As per MEDITECH setup

#### Setup Steps:
1. Work with MEDITECH implementation team
2. Request FHIR API activation
3. Configure authentication method
4. Obtain endpoint and credential details
5. Test integration in staging environment

---

## Authentication Methods

### 1. OAuth 2.0 (Recommended)
```bash
Required Information:
- Client ID
- Client Secret  
- Token Endpoint URL
- Authorization Scopes
- Grant Type (usually client_credentials)
```

### 2. Basic Authentication
```bash
Required Information:
- Username
- Password
- Realm/Domain (if applicable)
```

### 3. Bearer Token
```bash
Required Information:
- Static API Token
- Token Expiration (if applicable)
- Token Refresh Process
```

### 4. Custom Authentication
```bash
Required Information:
- Authentication method details
- Required headers
- Custom authentication flow
```

---

## Network and Security Requirements

### Firewall Configuration
```
Source: ECR Rule Builder Server
Destination: FHIR Endpoint
Protocol: HTTPS (TCP)
Port: 443
Direction: Outbound
```

### Certificate Requirements
- Valid SSL certificates on FHIR endpoints
- Trust chain properly configured
- Certificate authority recognized by ECR server

### IP Whitelisting (if required)
Provide ECR server IP addresses to EHR vendor for whitelisting:
- Production server IP(s)
- Staging server IP(s)
- Backup server IP(s)

---

## Testing and Validation

### Pre-Integration Testing
1. **Capability Statement**: Verify `/metadata` endpoint
2. **Authentication**: Test credential validity
3. **Resource Access**: Confirm access to required resources
4. **Search Parameters**: Validate search functionality

### Integration Testing Checklist
- [ ] FHIR endpoint connectivity
- [ ] Authentication successful
- [ ] Patient data retrieval
- [ ] Condition data access
- [ ] Observation data access
- [ ] Search parameter functionality
- [ ] Error handling
- [ ] Performance testing

### Sample Test Queries
```http
GET [base]/metadata
GET [base]/Patient?_count=5
GET [base]/Condition?patient=[id]
GET [base]/Observation?subject=[id]&category=vital-signs
```

---

## Common Integration Scenarios

### Scenario 1: Single Hospital with Epic
```bash
FHIR_ENDPOINT_1_ENABLED=true
FHIR_ENDPOINT_1_NAME="Main Hospital Epic"
FHIR_ENDPOINT_1_URL=https://fhir.hospital.com/interconnect-fhir-oauth/api/FHIR/R4
FHIR_ENDPOINT_1_AUTH=oauth
FHIR_ENDPOINT_1_CLIENT_ID=epic-client-123
FHIR_ENDPOINT_1_CLIENT_SECRET=secret-key-456
```

### Scenario 2: Multi-Site Health System
```bash
# Main Campus - Epic
FHIR_ENDPOINT_1_ENABLED=true
FHIR_ENDPOINT_1_NAME="Main Campus Epic"
FHIR_ENDPOINT_1_URL=https://main.healthsystem.com/fhir/R4

# Satellite Clinic - Cerner  
FHIR_ENDPOINT_2_ENABLED=true
FHIR_ENDPOINT_2_NAME="Satellite Clinic Cerner"
FHIR_ENDPOINT_2_URL=https://clinic.healthsystem.com/fhir/r4

# Urgent Care - eCW
FHIR_ENDPOINT_3_ENABLED=true
FHIR_ENDPOINT_3_NAME="Urgent Care eCW"
FHIR_ENDPOINT_3_URL=https://urgentcare.healthsystem.com/fhir/R4
```

### Scenario 3: Cloud + On-Premises Hybrid
```bash
# Cloud EHR
FHIR_ENDPOINT_1_URL=https://cloud.ehrendor.com/fhir/R4

# On-premises EHR (VPN access)
FHIR_ENDPOINT_2_URL=https://10.1.1.100/fhir/R4
```

---

## Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Failures
**Problem**: 401 Unauthorized errors
**Solutions**:
- Verify client credentials are correct
- Check token expiration
- Ensure proper scopes are requested
- Validate authentication method configuration

#### 2. Network Connectivity
**Problem**: Connection timeouts or refused connections
**Solutions**:
- Verify FHIR endpoint URL is accessible
- Check firewall rules and network policies
- Test with curl or Postman first
- Validate SSL certificates

#### 3. Data Access Issues
**Problem**: Empty responses or missing data
**Solutions**:
- Verify required FHIR resources are available
- Check search parameter syntax
- Ensure proper permissions for data access
- Review FHIR capability statement

#### 4. Performance Issues
**Problem**: Slow response times
**Solutions**:
- Implement response caching
- Use appropriate result set limits (_count parameter)
- Consider pagination for large datasets
- Monitor network latency

---

## Vendor Contact Information

### Epic Systems
- **Developer Portal**: https://fhir.epic.com/
- **Support**: Epic technical support team
- **Documentation**: Epic FHIR documentation

### Cerner/Oracle Health
- **Developer Portal**: https://code.cerner.com/
- **Support**: Cerner developer support
- **Documentation**: Cerner FHIR API documentation

### McKesson (Paragon)
- **Support**: McKesson Paragon support team
- **Contact**: Through existing support channels

### eClinicalWorks
- **Support**: eCW technical support
- **Documentation**: eCW API documentation portal

### athenahealth
- **Developer Portal**: https://docs.athenahealth.com/
- **Support**: athenahealth developer support

### NextGen Healthcare
- **Support**: NextGen technical support team
- **Documentation**: NextGen API documentation

---

## Example Integration Checklist

### For Integration Partners

- [ ] Identify customer's EHR vendor(s)
- [ ] Gather FHIR endpoint information
- [ ] Obtain authentication credentials
- [ ] Configure network access (firewalls, VPN)
- [ ] Test connectivity and data access
- [ ] Configure ECR Rule Builder environment
- [ ] Validate rule testing against live data
- [ ] Document configuration for customer support
- [ ] Plan production deployment and monitoring

### For Healthcare Organizations

- [ ] Identify all EHR systems requiring integration
- [ ] Contact EHR vendor(s) for FHIR API access
- [ ] Provide use case and data requirements
- [ ] Obtain necessary approvals and contracts
- [ ] Configure authentication and security
- [ ] Coordinate with IT team for network access
- [ ] Plan testing phase with integration partner
- [ ] Prepare for production go-live

---

**Note**: This document should be customized based on specific customer requirements and updated as EHR vendor APIs evolve. Always consult with the specific EHR vendor's latest documentation and support teams for the most current integration requirements.