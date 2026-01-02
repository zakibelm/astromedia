import { z } from "zod";

export const CMOOutputSchema = z.object({
    executiveSummary: z.string(),
    keyMessages: z.array(z.string()),
    kpis: z.array(z.string()),
    strategicPillars: z.array(z.object({ pillar: z.string(), tactics: z.array(z.string()) })),
    channelMix: z.array(z.object({
        channel: z.string(),
        role: z.string(),
        formats: z.array(z.string()),
        kpis: z.array(z.string()),
        budgetPercent: z.number()
    })),
    risks: z.array(z.string()),
    actions: z.array(z.string())
});

export const MarketAnalystOutputSchema = z.object({
    slides: z.array(z.object({
        title: z.string(),
        layout: z.enum(['default', 'swot_grid']),
        content: z.array(z.string()),
    }))
});

export const ContentWriterOutputSchema = z.object({
    outline: z.array(z.string()),
    body: z.string(),
    titles: z.array(z.string()).length(3),
    meta: z.string().max(160),
    images: z.array(z.object({ suggestion: z.string(), alt: z.string() })),
    abVariants: z.array(z.string()).optional()
});

export const SEOOutputSchema = z.object({
    keywords: z.array(z.object({
        keyword: z.string(),
        volume: z.number().optional(),
        intent: z.string(),
        difficulty: z.number().optional()
    })),
    clusters: z.array(z.object({
        cluster: z.string(),
        keywords: z.array(z.string()),
        opportunity: z.string()
    })),
    quickWins: z.array(z.string())
});

export const CopywriterOutputSchema = z.object({
    headlines: z.array(z.string()).length(3),
    ctas: z.array(z.string()).length(3),
    copyByChannel: z.record(z.string(), z.string())
});

export const ScriptwriterOutputSchema = z.object({
    creativeBriefs: z.array(z.object({
        platform: z.string(),
        format: z.string(),
        title: z.string(),
        creativeConcept: z.object({
            goal: z.string(),
            targetAudience: z.string(),
            tone: z.string(),
            sloganOrCta: z.string(),
            brandElements: z.string(),
            visualStyle: z.string(),
            constraints: z.string(),
        }),
        scenario: z.object({
            hook: z.string(),
            scenes: z.array(z.string()),
            cta: z.string(),
        }),
    }))
});

export const DesignerOutputSchema = z.object({
    visualSuggestion: z.string(),
    imagePrompts: z.object({
        artistic: z.string(),
        realistic: z.string(),
    }),
});

export const VideoProducerOutputSchema = z.object({
    videoPrompts: z.object({
        narrative: z.string(),
        dynamic: z.string(),
    }),
});

export const SocialOutputSchema = z.object({
    scheduledPosts: z.array(z.object({
        platform: z.string(),
        postCopy: z.string().max(280),
        hashtags: z.array(z.string()),
        visualSuggestion: z.string(),
        scheduledTime: z.string().datetime(),
    }))
});

export const AnalyticsOutputSchema = z.object({
    kpis: z.array(z.object({
        kpi: z.string(),
        value: z.number(),
        target: z.number(),
        status: z.enum(["on_track", "below", "above"])
    })),
    insights: z.array(z.string()).max(3),
    recommendations: z.array(z.object({
        action: z.string(),
        priority: z.number()
    }))
});

export type AnalyticsOutput = z.infer<typeof AnalyticsOutputSchema>;
