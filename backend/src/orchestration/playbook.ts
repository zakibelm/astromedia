// services/orchestration/playbook.ts
import { CampaignPlaybook } from "./types";

export const defaultPlaybook: CampaignPlaybook = {
  phases: [
    {
      id: "briefing",
      titleKey: "workflow.briefing.title",
      descriptionKey: "workflow.briefing.desc",
      agent: "Human",
      inputs: ["brandProfile", "goals", "persona", "budget", "timeline"],
      outputs: ["briefContext"],
      validation: "required"
    },
    {
      id: "research",
      titleKey: "workflow.research.title",
      descriptionKey: "workflow.research.desc",
      agent: "MarketAnalyst",
      inputs: ["briefContext", "analysisDepth"],
      outputs: ["marketAnalysisReport"],
      dependsOn: ["briefing"],
      validation: "mode_dependent"
    },
    {
      id: "strategy",
      titleKey: "workflow.strategy.title",
      descriptionKey: "workflow.strategy.desc",
      agent: "CMO",
      inputs: ["briefContext", "marketAnalysisReport"],
      outputs: ["strategyReport"],
      dependsOn: ["research"], // dépend maintenant de la recherche
      validation: "mode_dependent"
    },
    {
      id: "scriptwriting",
      titleKey: "workflow.scriptwriting.title",
      descriptionKey: "workflow.scriptwriting.desc",
      agent: "Scriptwriter",
      inputs: ["strategyReport"],
      outputs: ["creativeBriefs"],
      dependsOn: ["strategy"],
      validation: "mode_dependent",
      group: "production"
    },
    {
      id: "seo",
      titleKey: "workflow.seo.title",
      descriptionKey: "workflow.seo.desc",
      agent: "SEO",
      inputs: ["briefContext", "strategyReport"],
      outputs: ["keywordsList", "clusters", "seoOpportunities"],
      dependsOn: ["strategy"],
      validation: "mode_dependent",
      group: "production" // peut tourner en parallèle avec 'copy'
    },
    {
      id: "copy",
      titleKey: "workflow.copy.title",
      descriptionKey: "workflow.copy.desc",
      agent: "Copywriter",
      inputs: ["briefContext", "strategyReport"],
      outputs: ["headlines", "ctaList", "copyByChannel"],
      dependsOn: ["strategy"],
      validation: "mode_dependent",
      group: "production"
    },
    {
      id: "content",
      titleKey: "workflow.content.title",
      descriptionKey: "workflow.content.desc",
      agent: "ContentWriter",
      inputs: ["briefContext", "keywordsList", "tone", "creativeBriefs", "strategyReport"],
      outputs: ["articleMarkdown", "metaDescription", "altTexts", "ABVariants"],
      dependsOn: ["seo", "scriptwriting"],
      validation: "mode_dependent",
      group: "production"
    },
    {
      id: "visuals",
      titleKey: "workflow.visuals.title",
      descriptionKey: "workflow.visuals.desc",
      agent: "designer",
      inputs: ["strategyReport", "headlines", "creativeBriefs"],
      outputs: ["visuals", "validatedVisual"],
      dependsOn: ["copy", "scriptwriting"],
      validation: "mode_dependent",
      group: "production"
    },
    {
      id: "video",
      titleKey: "workflow.video.title",
      descriptionKey: "workflow.video.desc",
      agent: "video-producer",
      inputs: ["validatedVisual", "visuals", "creativeBriefs"],
      outputs: ["videos"],
      dependsOn: ["visuals"],
      validation: "mode_dependent",
      group: "production"
    },
    {
      id: "distribution",
      titleKey: "workflow.distribution.title",
      descriptionKey: "workflow.distribution.desc",
      agent: "Social",
      inputs: ["articleMarkdown", "headlines", "ctaList", "visuals", "videos"],
      outputs: ["scheduledPosts", "liveCampaign"],
      dependsOn: ["content", "visuals", "video"],
      validation: "mode_dependent"
    },
    {
      id: "analytics",
      titleKey: "workflow.analytics.title",
      descriptionKey: "workflow.analytics.desc",
      agent: "Analytics",
      inputs: ["liveCampaign", "goals"],
      outputs: ["kpiTable", "insights", "recommendations"],
      dependsOn: ["distribution"],
      validation: "optional"
    }
  ]
};