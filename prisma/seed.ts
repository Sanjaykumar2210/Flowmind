import { PrismaClient, Role, WorkflowStatus, TriggerType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { loadEnvironment } from "../lib/config/load-env";

loadEnvironment();
const prisma = new PrismaClient();

export const STARTER_TEMPLATES = [
  {
    name: "AI Customer Support Classifier",
    description: "Automatically analyzes customer support tickets using AI classification, routes high-priority complaints to notification channels, and sends automated resolution guidelines.",
    category: "Customer Support",
    icon: "Headphones",
    difficulty: "Beginner",
    definition: {
      nodes: [
        {
          id: "node-trigger-1",
          type: "trigger-manual",
          position: { x: 100, y: 250 },
          data: {
            label: "Incoming Ticket",
            description: "Receives user support message payload",
            config: {
              defaultPayload: JSON.stringify({
                ticketId: "TCK-8921",
                customerEmail: "sarah.connor@example.com",
                message: "We need an urgent password reset. Our production deployment is completely locked down!",
                department: "Infrastructure"
              }, null, 2)
            }
          }
        },
        {
          id: "node-ai-classify-1",
          type: "ai-classify",
          position: { x: 420, y: 250 },
          data: {
            label: "AI Ticket Classifier",
            description: "Classifies ticket category and urgency",
            config: {
              inputField: "{{node-trigger-1.message}}",
              categories: ["Critical Outage", "Account Support", "Billing & Invoice", "Feature Request", "General Inquiry"],
              outputSchema: {
                category: "string",
                priority: "High | Medium | Low",
                sentiment: "Positive | Neutral | Negative"
              }
            }
          }
        },
        {
          id: "node-condition-1",
          type: "logic-condition",
          position: { x: 750, y: 250 },
          data: {
            label: "Is High Urgency?",
            description: "Checks if category is Critical Outage or priority is High",
            config: {
              field: "{{node-ai-classify-1.priority}}",
              operator: "equals",
              value: "High"
            }
          }
        },
        {
          id: "node-action-webhook-1",
          type: "action-webhook",
          position: { x: 1100, y: 150 },
          data: {
            label: "Alert On-Call Ops",
            description: "Sends high priority alert webhook to pager / chat",
            config: {
              url: "https://httpbin.org/post",
              method: "POST",
              payload: JSON.stringify({
                event: "URGENT_SUPPORT_TICKET",
                ticketId: "{{node-trigger-1.ticketId}}",
                customer: "{{node-trigger-1.customerEmail}}",
                urgency: "{{node-ai-classify-1.priority}}",
                category: "{{node-ai-classify-1.category}}"
              }, null, 2)
            }
          }
        },
        {
          id: "node-action-email-1",
          type: "action-email",
          position: { x: 1100, y: 380 },
          data: {
            label: "Send Auto-Response",
            description: "Replies to customer with standard ticket acknowledgement",
            config: {
              to: "{{node-trigger-1.customerEmail}}",
              subject: "Ticket #{{node-trigger-1.ticketId}} Received - Flowmind Support",
              body: "Hi there,\n\nWe received your request: '{{node-trigger-1.message}}'.\nOur AI triage classified this as {{node-ai-classify-1.category}} (Priority: {{node-ai-classify-1.priority}}).\nAn agent will assist you promptly.\n\nFlowmind Support"
            }
          }
        }
      ],
      edges: [
        { id: "e1-2", source: "node-trigger-1", target: "node-ai-classify-1" },
        { id: "e2-3", source: "node-ai-classify-1", target: "node-condition-1" },
        { id: "e3-4", source: "node-condition-1", sourceHandle: "true", target: "node-action-webhook-1" },
        { id: "e3-5", source: "node-condition-1", sourceHandle: "false", target: "node-action-email-1" }
      ]
    }
  },
  {
    name: "HR Resume Information Extractor",
    description: "Extracts key candidate candidate attributes, technical skill sets, years of experience, and contact details from unformatted resume text.",
    category: "HR",
    icon: "UserCheck",
    difficulty: "Intermediate",
    definition: {
      nodes: [
        {
          id: "node-trig",
          type: "trigger-manual",
          position: { x: 100, y: 200 },
          data: {
            label: "Resume Submission",
            description: "Raw candidate resume content",
            config: {
              defaultPayload: JSON.stringify({
                applicantName: "Alex Mercer",
                resumeText: "Alex Mercer. Senior Full-Stack Engineer with 7 years experience in TypeScript, React, Node.js, and PostgreSQL. Contact: alex.mercer@dev.io, +1 555-0199. Led migration to microservices at CloudTech."
              }, null, 2)
            }
          }
        },
        {
          id: "node-ai-extract",
          type: "ai-extract",
          position: { x: 450, y: 200 },
          data: {
            label: "Extract Candidate Profile",
            description: "Converts resume into structured JSON schema",
            config: {
              inputField: "{{node-trig.resumeText}}",
              schemaDefinition: JSON.stringify({
                fullName: "string",
                email: "string",
                yearsExperience: "number",
                topSkills: "string[]",
                seniorityLevel: "Junior | Mid | Senior | Staff"
              }, null, 2)
            }
          }
        },
        {
          id: "node-transform",
          type: "action-transform",
          position: { x: 800, y: 200 },
          data: {
            label: "Format HR Record",
            description: "Prepares applicant database record",
            config: {
              mode: "map",
              expression: "{\n  id: Date.now(),\n  candidate: output.fullName,\n  seniority: output.seniorityLevel,\n  skillsCount: output.topSkills ? output.topSkills.length : 0\n}"
            }
          }
        }
      ],
      edges: [
        { id: "e1", source: "node-trig", target: "node-ai-extract" },
        { id: "e2", source: "node-ai-extract", target: "node-transform" }
      ]
    }
  },
  {
    name: "Sales Lead Classifier & Route",
    description: "Scores inbound sales inquiries by company size and budget, routing enterprise prospects directly to sales leadership.",
    category: "Sales & Marketing",
    icon: "TrendingUp",
    difficulty: "Beginner",
    definition: {
      nodes: [
        {
          id: "lead-trig",
          type: "trigger-webhook",
          position: { x: 100, y: 200 },
          data: {
            label: "Inbound Form Submission",
            description: "Receives webhook from marketing landing page",
            config: {
              method: "POST"
            }
          }
        },
        {
          id: "lead-ai",
          type: "ai-classify",
          position: { x: 420, y: 200 },
          data: {
            label: "Score Lead Tier",
            description: "Categorizes lead into Enterprise, Growth or Self-Serve",
            config: {
              inputField: "{{lead-trig.message}}",
              categories: ["Tier 1: Enterprise ($50k+)", "Tier 2: Mid-Market", "Tier 3: SMB", "Spam / Non-Business"]
            }
          }
        },
        {
          id: "lead-cond",
          type: "logic-condition",
          position: { x: 740, y: 200 },
          data: {
            label: "Is Enterprise Lead?",
            description: "Branches based on lead score tier",
            config: {
              field: "{{lead-ai.category}}",
              operator: "contains",
              value: "Enterprise"
            }
          }
        },
        {
          id: "lead-notify",
          type: "action-webhook",
          position: { x: 1050, y: 120 },
          data: {
            label: "Notify VP of Sales",
            description: "Immediate priority webhook dispatch",
            config: {
              url: "https://httpbin.org/post",
              method: "POST"
            }
          }
        }
      ],
      edges: [
        { id: "el-1", source: "lead-trig", target: "lead-ai" },
        { id: "el-2", source: "lead-ai", target: "lead-cond" },
        { id: "el-3", source: "lead-cond", sourceHandle: "true", target: "lead-notify" }
      ]
    }
  },
  {
    name: "Customer Feedback Sentiment Analyzer",
    description: "Monitors app reviews and CSAT comments, detects negative sentiment, and auto-generates root-cause summaries.",
    category: "Customer Support",
    icon: "MessageSquare",
    difficulty: "Beginner",
    definition: {
      nodes: [
        {
          id: "fb-trig",
          type: "trigger-manual",
          position: { x: 100, y: 200 },
          data: {
            label: "Feedback Input",
            description: "Customer review message",
            config: {
              defaultPayload: JSON.stringify({
                author: "david@corp.net",
                feedback: "The recent update made the dashboard load significantly slower. We experienced timeouts during checkout."
              }, null, 2)
            }
          }
        },
        {
          id: "fb-ai",
          type: "ai-classify",
          position: { x: 420, y: 200 },
          data: {
            label: "Detect Sentiment",
            description: "Analyzes emotional tone",
            config: {
              inputField: "{{fb-trig.feedback}}",
              categories: ["Negative", "Neutral", "Positive"]
            }
          }
        },
        {
          id: "fb-sum",
          type: "ai-summarize",
          position: { x: 740, y: 200 },
          data: {
            label: "Summarize Issue",
            description: "Condenses feedback into actionable product note",
            config: {
              inputField: "{{fb-trig.feedback}}",
              format: "bullet-points"
            }
          }
        }
      ],
      edges: [
        { id: "ef-1", source: "fb-trig", target: "fb-ai" },
        { id: "ef-2", source: "fb-ai", target: "fb-sum" }
      ]
    }
  },
  {
    name: "Automated Website & API Health Checker",
    description: "Periodically pings critical endpoints, verifies HTTP status codes, and alerts engineering when downtime is detected.",
    category: "DevOps",
    icon: "Activity",
    difficulty: "Intermediate",
    definition: {
      nodes: [
        {
          id: "hc-trig",
          type: "trigger-schedule",
          position: { x: 100, y: 200 },
          data: {
            label: "Every 5 Minutes",
            description: "Automated cron polling trigger",
            config: {
              cronExpression: "*/5 * * * *"
            }
          }
        },
        {
          id: "hc-http",
          type: "action-http",
          position: { x: 420, y: 200 },
          data: {
            label: "Check API Gateway",
            description: "Sends GET request to health endpoint",
            config: {
              url: "https://httpbin.org/status/200",
              method: "GET",
              timeoutMs: 5000
            }
          }
        },
        {
          id: "hc-cond",
          type: "logic-condition",
          position: { x: 740, y: 200 },
          data: {
            label: "Is HTTP 200 OK?",
            description: "Validates response status code",
            config: {
              field: "{{hc-http.status}}",
              operator: "equals",
              value: "200"
            }
          }
        }
      ],
      edges: [
        { id: "eh-1", source: "hc-trig", target: "hc-http" },
        { id: "eh-2", source: "hc-http", target: "hc-cond" }
      ]
    }
  },
  {
    name: "AI Meeting Notes Summarizer",
    description: "Transforms long-form audio transcripts or meeting notes into key decisions, action items, and owner assignments.",
    category: "Operations",
    icon: "FileText",
    difficulty: "Beginner",
    definition: {
      nodes: [
        {
          id: "meet-trig",
          type: "trigger-manual",
          position: { x: 100, y: 200 },
          data: {
            label: "Meeting Transcript",
            description: "Raw notes from sprint planning",
            config: {
              defaultPayload: JSON.stringify({
                meetingTitle: "Sprint 42 Kickoff",
                notes: "Team agreed to prioritize the Flowmind execution engine. Shubham will lead backend queue integration. Sarah will finalize React Flow custom nodes by Thursday."
              }, null, 2)
            }
          }
        },
        {
          id: "meet-sum",
          type: "ai-summarize",
          position: { x: 440, y: 200 },
          data: {
            label: "Extract Action Items",
            description: "Generates structured bulleted executive summary",
            config: {
              inputField: "{{meet-trig.notes}}",
              format: "executive-summary"
            }
          }
        }
      ],
      edges: [
        { id: "em-1", source: "meet-trig", target: "meet-sum" }
      ]
    }
  },
  {
    name: "Invoice & Receipt Data Extractor",
    description: "Extracts line items, vendor names, tax rates, and total amounts from OCR or raw invoice text.",
    category: "Operations",
    icon: "Receipt",
    difficulty: "Advanced",
    definition: {
      nodes: [
        {
          id: "inv-trig",
          type: "trigger-manual",
          position: { x: 100, y: 200 },
          data: {
            label: "Invoice Raw Text",
            description: "Unstructured receipt content",
            config: {
              defaultPayload: JSON.stringify({
                rawInvoice: "INVOICE #INV-2026-901\nVendor: Acme Cloud Services\nDate: 2026-11-01\nSubtotal: $450.00\nTax (10%): $45.00\nTotal Due: $495.00"
              }, null, 2)
            }
          }
        },
        {
          id: "inv-ai",
          type: "ai-extract",
          position: { x: 450, y: 200 },
          data: {
            label: "Extract Financials",
            description: "Structured extraction of numbers and vendor details",
            config: {
              inputField: "{{inv-trig.rawInvoice}}",
              schemaDefinition: JSON.stringify({
                invoiceNumber: "string",
                vendorName: "string",
                totalAmount: "number",
                taxAmount: "number",
                dueDate: "string"
              }, null, 2)
            }
          }
        }
      ],
      edges: [
        { id: "ei-1", source: "inv-trig", target: "inv-ai" }
      ]
    }
  },
  {
    name: "Scheduled API Health Monitor",
    description: "Runs recurring synthetic API tests with latency measurement and error alerting.",
    category: "DevOps",
    icon: "Clock",
    difficulty: "Intermediate",
    definition: {
      nodes: [
        {
          id: "sam-sched",
          type: "trigger-schedule",
          position: { x: 100, y: 200 },
          data: {
            label: "Hourly Check",
            description: "Executes at minute 0 every hour",
            config: {
              cronExpression: "0 * * * *"
            }
          }
        },
        {
          id: "sam-http",
          type: "action-http",
          position: { x: 420, y: 200 },
          data: {
            label: "Ping Production Health",
            description: "Queries HTTP API endpoint",
            config: {
              url: "https://httpbin.org/get",
              method: "GET"
            }
          }
        }
      ],
      edges: [
        { id: "es-1", source: "sam-sched", target: "sam-http" }
      ]
    }
  }
];

async function main() {
  console.log("🌱 Seeding Flowmind database...");

  // 1. Create or update the explicitly configured seed user
  const { getSeedAdminConfig } = await import("../lib/config/env");
  const { email, password } = getSeedAdminConfig();
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: "Flowmind Admin",
      passwordHash
    },
    create: {
      email,
      name: "Flowmind Admin",
      passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=faces"
    }
  });
  console.log(`👤 User ready: ${user.email} (${user.id})`);

  // 2. Create or update Default Workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "default-workspace" },
    update: {
      name: "Primary Workspace",
      ownerId: user.id
    },
    create: {
      name: "Primary Workspace",
      slug: "default-workspace",
      ownerId: user.id
    }
  });
  console.log(`🏢 Workspace ready: ${workspace.name} (${workspace.id})`);

  // 3. Ensure membership
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id
      }
    },
    update: { role: Role.OWNER },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: Role.OWNER
    }
  });

  // 4. Seed Templates
  console.log("📦 Seeding starter templates...");
  for (const tpl of STARTER_TEMPLATES) {
    const existing = await prisma.workflowTemplate.findFirst({
      where: { name: tpl.name }
    });

    if (existing) {
      await prisma.workflowTemplate.update({
        where: { id: existing.id },
        data: {
          description: tpl.description,
          category: tpl.category,
          icon: tpl.icon,
          difficulty: tpl.difficulty,
          definition: tpl.definition
        }
      });
    } else {
      await prisma.workflowTemplate.create({
        data: {
          name: tpl.name,
          description: tpl.description,
          category: tpl.category,
          icon: tpl.icon,
          difficulty: tpl.difficulty,
          isOfficial: true,
          definition: tpl.definition
        }
      });
    }
  }
  console.log(`✅ Seeded ${STARTER_TEMPLATES.length} starter templates`);

  // 5. Create Initial Demo Workflow if none exists
  const existingWorkflow = await prisma.workflow.findFirst({
    where: { workspaceId: workspace.id }
  });

  if (!existingWorkflow) {
    const sampleTemplate = STARTER_TEMPLATES[0];
    const workflow = await prisma.workflow.create({
      data: {
        workspaceId: workspace.id,
        name: "AI Customer Support Triage",
        description: "Classifies incoming customer issues and routes high priority items automatically.",
        status: WorkflowStatus.ACTIVE,
        triggerType: TriggerType.MANUAL,
        isPublished: true
      }
    });

    const version = await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        versionNumber: 1,
        description: "Initial published version",
        definition: sampleTemplate.definition,
        isPublished: true
      }
    });

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { currentVersionId: version.id }
    });

    console.log(`✨ Created sample workflow: ${workflow.name} (${workflow.id})`);
  }

  console.log("🏁 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

