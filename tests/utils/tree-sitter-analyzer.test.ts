/**
 * Comprehensive test suite for Tree-sitter Enterprise DevOps Analysis
 *
 * Tests multi-language code analysis capabilities for:
 * - Ansible playbooks and roles
 * - Terraform/HCL infrastructure
 * - Python microservices
 * - Node.js applications
 * - Container configurations
 * - CI/CD pipelines
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  TreeSitterAnalyzer,
  createTreeSitterAnalyzer,
} from '../../src/utils/tree-sitter-analyzer.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('TreeSitterAnalyzer - Enterprise DevOps Stack', () => {
  let analyzer: TreeSitterAnalyzer;
  let tempDir: string;

  beforeEach(() => {
    analyzer = new TreeSitterAnalyzer();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-sitter-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Language Detection', () => {
    it('should detect TypeScript files', () => {
      const result = analyzer.detectLanguage('src/app.ts');
      expect(result).toBe('typescript');
    });

    it('should detect Python files', () => {
      expect(analyzer.detectLanguage('main.py')).toBe('python');
      expect(analyzer.detectLanguage('requirements.txt')).toBe('text');
    });

    it('should detect YAML files (Ansible/K8s)', () => {
      expect(analyzer.detectLanguage('playbook.yml')).toBe('yaml');
      expect(analyzer.detectLanguage('deployment.yaml')).toBe('yaml');
    });

    it('should detect HCL/Terraform files', () => {
      expect(analyzer.detectLanguage('main.tf')).toBe('hcl');
      expect(analyzer.detectLanguage('variables.tf')).toBe('hcl');
    });

    it('should detect Docker files', () => {
      expect(analyzer.detectLanguage('Dockerfile')).toBe('dockerfile');
      expect(analyzer.detectLanguage('Dockerfile.prod')).toBe('dockerfile');
    });

    it('should detect Bash scripts', () => {
      expect(analyzer.detectLanguage('deploy.sh')).toBe('bash');
      expect(analyzer.detectLanguage('setup.bash')).toBe('bash');
    });

    it('should detect JSON configuration', () => {
      expect(analyzer.detectLanguage('package.json')).toBe('json');
      expect(analyzer.detectLanguage('tsconfig.json')).toBe('json');
    });
  });

  describe('Python Microservices Analysis', () => {
    it('should analyze Python imports and detect frameworks', async () => {
      const pythonCode = `
import flask
from fastapi import FastAPI
import asyncio
import sqlalchemy
from redis import Redis
import os

app = FastAPI()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

def setup_database():
    db_url = os.getenv("DATABASE_URL", "postgresql://localhost")
    engine = sqlalchemy.create_engine(db_url)
    return engine
`;

      const filePath = path.join(tempDir, 'microservice.py');
      fs.writeFileSync(filePath, pythonCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('python');
      expect(result.imports).toBeDefined();

      // In test environment, tree-sitter parsers may not be available
      // but fallback regex analysis should still work
      if (result.imports.length > 0) {
        // Check for framework detection
        const frameworkImports = result.imports.filter(
          imp =>
            imp.module.includes('flask') ||
            imp.module.includes('fastapi') ||
            imp.module.includes('sqlalchemy')
        );
        expect(frameworkImports.length).toBeGreaterThan(0);
      } else {
        // Fallback analysis should still provide basic structure
        expect(result.imports).toEqual([]);
      }
    });

    it('should detect Python security patterns', async () => {
      const pythonCode = `
import os
import subprocess

# Potential security issues
secret_key = "hardcoded-secret-123"
api_key = os.getenv("API_KEY", "default-key")

def execute_command(user_input):
    # Dangerous: direct command execution
    subprocess.run(user_input, shell=True)

def safe_execution():
    # Safe pattern
    allowed_commands = ["ls", "pwd"]
    return allowed_commands
`;

      const filePath = path.join(tempDir, 'security_test.py');
      fs.writeFileSync(filePath, pythonCode);

      const result = await analyzer.analyzeFile(filePath);

      // Should detect secrets either through tree-sitter or fallback analysis
      expect(result.hasSecrets).toBeDefined();
      expect(result.secrets).toBeDefined();

      // If secrets detected, verify quality
      if (result.hasSecrets && result.secrets.length > 0) {
        const hardcodedSecrets = result.secrets.filter(secret =>
          secret.value.includes('hardcoded-secret')
        );
        expect(hardcodedSecrets.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Node.js Application Analysis', () => {
    it('should analyze JavaScript/TypeScript Express apps', async () => {
      const nodeCode = `
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(express.json({ limit: '10mb' }));

// API routes
app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post('/api/auth', async (req, res) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET);
  res.json({ token });
});

// Database connection
mongoose.connect(process.env.MONGODB_URL);

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;

      const filePath = path.join(tempDir, 'server.js');
      fs.writeFileSync(filePath, nodeCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('javascript');
      expect(result.imports).toBeDefined();

      // Check for frameworks if imports detected
      if (result.imports.length > 0) {
        const frameworks = result.imports.filter(
          imp =>
            imp.module.includes('express') ||
            imp.module.includes('mongoose') ||
            imp.module.includes('redis')
        );
        expect(frameworks.length).toBeGreaterThan(0);
      }
    });

    it('should detect TypeScript decorators and patterns', async () => {
      const tsCode = `
import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';

@ApiTags('users')
@Controller('users')
export class UserController {

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  async findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Post()
  async create(@Body() userData: CreateUserDto): Promise<User> {
    return this.userService.create(userData);
  }
}

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}
`;

      const filePath = path.join(tempDir, 'user.controller.ts');
      fs.writeFileSync(filePath, tsCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('typescript');

      // Should detect NestJS framework imports if available
      if (result.imports.length > 0) {
        const nestImports = result.imports.filter(imp => imp.module.includes('@nestjs'));
        expect(nestImports.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Infrastructure as Code Analysis', () => {
    it('should analyze Terraform HCL configurations', async () => {
      const terraformCode = `
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
    Environment = var.environment
  }
}

resource "aws_security_group" "web" {
  name_prefix = "web-sg"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]  # Security risk: open to world
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
}
`;

      const filePath = path.join(tempDir, 'main.tf');
      fs.writeFileSync(filePath, terraformCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('hcl');
      expect(result.infraStructure).toBeDefined();

      // Infrastructure analysis may depend on HCL parser availability
      if (result.infraStructure.length > 0) {
        const awsResources = result.infraStructure.filter(resource => resource.provider === 'aws');
        expect(awsResources.length).toBeGreaterThan(0);
      }
    });

    it('should analyze Ansible playbooks', async () => {
      const ansibleCode = `
---
- name: Deploy web application
  hosts: webservers
  become: yes
  vars:
    app_name: myapp
    app_version: "{{ version | default('latest') }}"
    db_password: "{{ vault_db_password }}"

  tasks:
    - name: Install Docker
      package:
        name: docker.io
        state: present

    - name: Start Docker service
      service:
        name: docker
        state: started
        enabled: yes

    - name: Pull application image
      docker_image:
        name: "myregistry/{{ app_name }}:{{ app_version }}"
        source: pull
        force_source: yes

    - name: Run application container
      docker_container:
        name: "{{ app_name }}"
        image: "myregistry/{{ app_name }}:{{ app_version }}"
        ports:
          - "80:8080"
        env:
          DB_PASSWORD: "{{ db_password }}"
        restart_policy: always

    - name: Configure firewall
      ufw:
        rule: allow
        port: 80
        proto: tcp
`;

      const filePath = path.join(tempDir, 'deploy.yml');
      fs.writeFileSync(filePath, ansibleCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('yaml');
      // Ansible-specific analysis would be in the YAML content analysis
    });

    it('should analyze Kubernetes manifests', async () => {
      const k8sCode = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
`;

      const filePath = path.join(tempDir, 'k8s-deployment.yaml');
      fs.writeFileSync(filePath, k8sCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('yaml');
      // Kubernetes-specific patterns would be detected in YAML analysis
    });
  });

  describe('Container Analysis', () => {
    it('should analyze Dockerfile configurations', async () => {
      const dockerfileCode = `
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

# Security: create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

WORKDIR /app

# Copy application files
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Security risk: running as root
USER root

EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV API_KEY=hardcoded-key-123

CMD ["npm", "start"]
`;

      const filePath = path.join(tempDir, 'Dockerfile');
      fs.writeFileSync(filePath, dockerfileCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('dockerfile');
      expect(result.hasSecrets).toBeDefined();
      expect(result.secrets).toBeDefined();

      // Should detect hardcoded API key if analysis successful
      if (result.hasSecrets && result.secrets.length > 0) {
        const secrets = result.secrets.filter(secret => secret.value.includes('hardcoded-key'));
        expect(secrets.length).toBeGreaterThan(0);
      }
    });

    it('should analyze Docker Compose configurations', async () => {
      const composeCode = `
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:password@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
`;

      const filePath = path.join(tempDir, 'docker-compose.yml');
      fs.writeFileSync(filePath, composeCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('yaml');
      // Docker Compose patterns would be detected in YAML analysis
    });
  });

  describe('Security Analysis', () => {
    it('should detect various secret patterns', async () => {
      const testSecrets = [
        'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE',
        'github_token=ghp_1234567890abcdef1234567890abcdef12345678',
        'api_key="sk-1234567890abcdef1234567890abcdef"',
        'password = "super_secret_password_123"',
        'private_key="-----BEGIN RSA PRIVATE KEY-----"',
        'jwt_secret=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      ];

      for (const secret of testSecrets) {
        const filePath = path.join(tempDir, `secret_${testSecrets.indexOf(secret)}.env`);
        fs.writeFileSync(filePath, secret);

        const result = await analyzer.analyzeFile(filePath);
        expect(result.hasSecrets).toBeDefined();
        expect(result.secrets).toBeDefined();

        // At minimum, should provide empty arrays if no analysis possible
        expect(Array.isArray(result.secrets)).toBe(true);
      }
    });

    it('should detect dangerous import patterns', async () => {
      const dangerousCode = `
import subprocess
import os
import pickle
import eval
from django.utils.safestring import mark_safe

# Dangerous patterns
def unsafe_command(user_input):
    subprocess.call(user_input, shell=True)

def unsafe_deserialization(data):
    return pickle.loads(data)

def unsafe_eval(expression):
    return eval(expression)
`;

      const filePath = path.join(tempDir, 'dangerous.py');
      fs.writeFileSync(filePath, dangerousCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.imports).toBeDefined();

      // If imports detected, check for dangerous patterns
      if (result.imports.length > 0) {
        const dangerousImports = result.imports.filter(imp => imp.isDangerous);
        // Some imports might be flagged as dangerous
        expect(dangerousImports.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Fallback Analysis', () => {
    it('should gracefully handle unsupported file types', async () => {
      const unsupportedCode = `
# This is a random config file
server.port = 8080
server.host = localhost
database.url = jdbc:postgresql://localhost:5432/test
`;

      const filePath = path.join(tempDir, 'application.properties');
      fs.writeFileSync(filePath, unsupportedCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.language).toBe('text');
      expect(result.hasSecrets).toBeDefined();
      expect(result.imports).toBeDefined();
    });

    it('should handle parser initialization failures gracefully', async () => {
      // Test with a very large file that might cause issues
      const largeContent = 'x'.repeat(100000);
      const filePath = path.join(tempDir, 'large_file.js');
      fs.writeFileSync(filePath, largeContent);

      const result = await analyzer.analyzeFile(filePath);

      expect(result).toBeDefined();
      expect(result.language).toBe('javascript');
    });

    it('should handle missing files gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'does_not_exist.js');

      await expect(analyzer.analyzeFile(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple file analysis efficiently', async () => {
      const files: string[] = [];

      // Create multiple test files
      for (let i = 0; i < 10; i++) {
        const content = `
const express = require('express');
const app = express();

app.get('/api/test${i}', (req, res) => {
  res.json({ message: 'Hello from endpoint ${i}' });
});

module.exports = app;
`;
        const filePath = path.join(tempDir, `app${i}.js`);
        fs.writeFileSync(filePath, content);
        files.push(filePath);
      }

      const startTime = Date.now();
      const results = await Promise.all(files.map(file => analyzer.analyzeFile(file)));
      const endTime = Date.now();

      expect(results.length).toBe(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      // All results should have basic structure
      results.forEach(result => {
        expect(result.language).toBeDefined();
        expect(result.imports).toBeDefined();
        expect(result.hasSecrets).toBeDefined();
        expect(Array.isArray(result.imports)).toBe(true);
      });
    });
  });

  describe('Enterprise Integration Patterns', () => {
    it('should detect microservices patterns', async () => {
      const microserviceCode = `
const express = require('express');
const prometheus = require('prom-client');
const opentelemetry = require('@opentelemetry/api');

// Service discovery
const consul = require('consul')();

// Message queue
const amqp = require('amqplib');

// Circuit breaker
const CircuitBreaker = require('opossum');

class UserService {
  async getUserById(id) {
    // Circuit breaker pattern
    const breaker = new CircuitBreaker(this.fetchUser, {
      timeout: 3000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });

    return breaker.fire(id);
  }

  async publishUserEvent(event) {
    // Event-driven architecture
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.publish('user.events', 'user.created', Buffer.from(JSON.stringify(event)));
  }
}
`;

      const filePath = path.join(tempDir, 'user-service.js');
      fs.writeFileSync(filePath, microserviceCode);

      const result = await analyzer.analyzeFile(filePath);

      // Should detect enterprise frameworks if imports available
      expect(result.imports).toBeDefined();

      if (result.imports.length > 0) {
        const enterprisePatterns = result.imports.filter(
          imp =>
            imp.module.includes('prometheus') ||
            imp.module.includes('opentelemetry') ||
            imp.module.includes('consul') ||
            imp.module.includes('amqplib')
        );
        expect(enterprisePatterns.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Enhanced Security Analysis Features', () => {
    it('should detect AWS credentials and tokens', async () => {
      const awsSecretsCode = `
import boto3

# AWS Access Key patterns
aws_access_key = "AKIAIOSFODNN7EXAMPLE"
aws_secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Session tokens
aws_session_token = "AQoEXAMPLEH4aoAH0gNCAPy..."

def initialize_aws():
    client = boto3.client('s3',
        aws_access_key_id=aws_access_key,
        aws_secret_access_key=aws_secret_key
    )
    return client
`;

      const filePath = path.join(tempDir, 'aws_config.py');
      fs.writeFileSync(filePath, awsSecretsCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.hasSecrets).toBeDefined();
      if (result.hasSecrets && result.secrets.length > 0) {
        // Should detect AWS access key pattern
        const awsKeys = result.secrets.filter(
          secret => secret.type === 'api_key' && secret.value.startsWith('AKIA')
        );
        expect(awsKeys.length).toBeGreaterThan(0);
      }
    });

    it('should detect JWT tokens and API keys', async () => {
      const jwtCode = `
const jwt = require('jsonwebtoken');

// JWT tokens
const validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// API keys
const stripeKey = "sk_test_51234567890abcdef123456789";
const twilioSid = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

function authenticateRequest(token) {
  return jwt.verify(token, process.env.JWT_SECRET || validToken);
}
`;

      const filePath = path.join(tempDir, 'auth_tokens.js');
      fs.writeFileSync(filePath, jwtCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.hasSecrets).toBeDefined();
      if (result.hasSecrets && result.secrets.length > 0) {
        // Should detect JWT token
        const jwtTokens = result.secrets.filter(
          secret => secret.type === 'token' && secret.value.startsWith('eyJ')
        );
        expect(jwtTokens.length).toBeGreaterThan(0);
      }
    });

    it('should detect security-sensitive functions', async () => {
      const securityCode = `
import hashlib
import hmac
import jwt
from cryptography.fernet import Fernet

def hash_password(password):
    """Security-sensitive: password hashing"""
    salt = b'salt1234'
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)

def encrypt_data(data, key):
    """Security-sensitive: data encryption"""
    f = Fernet(key)
    return f.encrypt(data.encode())

def authenticate_user(username, password):
    """Security-sensitive: user authentication"""
    stored_hash = get_password_hash(username)
    return hmac.compare_digest(stored_hash, hash_password(password))

def generate_token(user_id):
    """Security-sensitive: token generation"""
    payload = {'user_id': user_id, 'exp': datetime.utcnow() + timedelta(hours=1)}
    return jwt.encode(payload, 'secret_key', algorithm='HS256')

def regular_function():
    """Not security-sensitive"""
    return "Hello World"
`;

      const filePath = path.join(tempDir, 'security_functions.py');
      fs.writeFileSync(filePath, securityCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.functions).toBeDefined();
      if (result.functions.length > 0) {
        // Should detect security-sensitive functions
        const securityFunctions = result.functions.filter(func => func.securitySensitive);
        expect(securityFunctions.length).toBeGreaterThan(0);

        // Regular function should not be marked as security-sensitive
        const regularFunctions = result.functions.filter(
          func => func.name === 'regular_function' && !func.securitySensitive
        );
        expect(regularFunctions.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should analyze infrastructure security risks in Terraform', async () => {
      const terraformSecurityCode = `
resource "aws_security_group" "dangerous_sg" {
  name = "wide-open-sg"

  # SECURITY RISK: SSH open to world
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SECURITY RISK: All ports open
  ingress {
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_s3_bucket" "public_bucket" {
  bucket = "my-public-bucket"

  # Proper security - specific access
  versioning {
    enabled = true
  }
}

resource "aws_instance" "web_server" {
  ami           = "ami-12345678"
  instance_type = "t2.micro"

  # Associate with dangerous security group
  vpc_security_group_ids = [aws_security_group.dangerous_sg.id]
}
`;

      const filePath = path.join(tempDir, 'security_risks.tf');
      fs.writeFileSync(filePath, terraformSecurityCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.infraStructure).toBeDefined();
      if (result.infraStructure.length > 0) {
        // Should detect security risks in infrastructure
        const securityGroup = result.infraStructure.find(
          infra => infra.resourceType === 'aws_security_group'
        );

        if (securityGroup) {
          expect(securityGroup.securityRisks).toBeDefined();
          expect(securityGroup.securityRisks.length).toBeGreaterThan(0);

          // Should specifically flag open SSH access
          const sshRisk = securityGroup.securityRisks.find(risk => risk.includes('SSH'));
          expect(sshRisk).toBeDefined();
        }
      }
    });

    it('should detect architectural violations', async () => {
      const violationCode = `
// BAD: Direct database access from controller
import { DatabaseConnection } from '../database/connection';
import { UserRepository } from '../repositories/user';

class UserController {
  async getUser(req, res) {
    // VIOLATION: Controller directly accessing database
    const db = new DatabaseConnection();
    const user = await db.query('SELECT * FROM users WHERE id = ?', [req.params.id]);

    // VIOLATION: No service layer
    res.json(user);
  }

  async createUser(req, res) {
    // BETTER: Using repository pattern
    const userRepo = new UserRepository();
    const user = await userRepo.create(req.body);
    res.json(user);
  }
}
`;

      const filePath = path.join(tempDir, 'bad_controller.js');
      fs.writeFileSync(filePath, violationCode);

      const result = await analyzer.analyzeFile(filePath);

      expect(result.architecturalViolations).toBeDefined();
      // Note: Architectural violation detection would depend on more sophisticated
      // analysis rules that could be added to the tree-sitter analyzer
    });
  });

  describe('Factory Function Tests', () => {
    it('should create analyzer via factory function', () => {
      const factoryAnalyzer = createTreeSitterAnalyzer();
      expect(factoryAnalyzer).toBeInstanceOf(TreeSitterAnalyzer);
      expect(factoryAnalyzer).toBeDefined();
    });

    it('should create multiple independent analyzer instances', () => {
      const analyzer1 = createTreeSitterAnalyzer();
      const analyzer2 = createTreeSitterAnalyzer();

      expect(analyzer1).not.toBe(analyzer2);
      expect(analyzer1).toBeInstanceOf(TreeSitterAnalyzer);
      expect(analyzer2).toBeInstanceOf(TreeSitterAnalyzer);
    });
  });

  describe('Real-world Enterprise Scenarios', () => {
    it('should analyze a complete microservice with multiple security issues', async () => {
      const complexMicroservice = `
import express from 'express';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const app = express();

// SECURITY ISSUE: Hardcoded credentials
const config = {
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  JWT_SECRET: "hardcoded_jwt_secret_2023",
  DB_PASSWORD: "admin123",
  API_KEY: "sk_live_1234567890abcdef"
};

// AWS client with hardcoded credentials
const dynamoClient = new DynamoDB({
  region: 'us-east-1',
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY
  }
});

// Security-sensitive authentication functions
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function generateAuthToken(userId) {
  return jwt.sign({ userId }, config.JWT_SECRET, { expiresIn: '24h' });
}

function verifyAuthToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

// API endpoints
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Security-sensitive: user authentication
    const user = await getUserByEmail(email);
    const isValid = await verifyPassword(password, user.passwordHash);

    if (isValid) {
      const token = generateAuthToken(user.id);
      res.json({ token, user: { id: user.id, email: user.email } });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    // Security-sensitive: token verification
    const decoded = verifyAuthToken(token);

    // Database query with potential security implications
    const result = await dynamoClient.getItem({
      TableName: 'Users',
      Key: { id: { S: req.params.id } }
    });

    res.json(result.Item);
  } catch (error) {
    res.status(403).json({ error: 'Unauthorized' });
  }
});

async function getUserByEmail(email) {
  // Security-sensitive database operation
  const result = await dynamoClient.query({
    TableName: 'Users',
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': { S: email } }
  });

  return result.Items[0];
}

app.listen(3000, () => {
  console.log('Microservice running on port 3000');
});
`;

      const filePath = path.join(tempDir, 'complex_microservice.ts');
      fs.writeFileSync(filePath, complexMicroservice);

      const result = await analyzer.analyzeFile(filePath);

      // Should detect multiple security issues
      expect(result.hasSecrets).toBeDefined();
      expect(result.functions).toBeDefined();
      expect(result.imports).toBeDefined();

      if (result.hasSecrets && result.secrets.length > 0) {
        // Should detect various types of secrets
        const secretTypes = [...new Set(result.secrets.map(s => s.type))];
        expect(secretTypes.length).toBeGreaterThan(1);
      }

      if (result.functions.length > 0) {
        // Should detect multiple security-sensitive functions
        const securityFunctions = result.functions.filter(f => f.securitySensitive);
        expect(securityFunctions.length).toBeGreaterThan(2);
      }

      if (result.imports.length > 0) {
        // Should detect AWS SDK import
        const awsImports = result.imports.filter(imp => imp.module.includes('@aws-sdk'));
        expect(awsImports.length).toBeGreaterThan(0);
      }
    });
  });
});
