import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(defineConfig({
  title: 'MCP ADR Analysis Server',
  description: 'AI-powered architectural analysis for intelligent development workflows',
  base: '/mcp-adr-analysis-server/',
  
  mermaid: {
    theme: 'default'
  },
  
  ignoreDeadLinks: [
    // Tutorial placeholders
    /\/tutorials\/security-focused-workflow/,
    /\/tutorials\/team-collaboration/,
    // How-to placeholders  
    /\/how-to-guides\/security-analysis/,
    /\/how-to-guides\/deployment-readiness/,
    /\/how-to-guides\/migrate-existing-adrs/,
    /\/how-to-guides\/cicd-integration/,
    /\/how-to-guides\/large-team-scaling/,
    /\/how-to-guides\/prd-to-adrs/,
    /\/how-to-guides\/progress-tracking/,
    /\/how-to-guides\/custom-rules/,
    // Reference placeholders
    /\/reference\/analysis-tools/,
    /\/reference\/generation-tools/,
    /\/reference\/security-tools/,
    /\/reference\/validation-tools/,
    /\/reference\/environment-config/,
    /\/reference\/mcp-client-config/,
    /\/reference\/adr-templates/,
    /\/reference\/json-schemas/,
    // Explanation placeholders
    /\/explanation\/adr-philosophy/,
    /\/explanation\/ai-architecture-concepts/,
    /\/explanation\/tool-design/,
    /\/explanation\/security-philosophy/,
    /\/explanation\/knowledge-graph/,
    /\/explanation\/prompt-engineering/,
    /\/explanation\/performance-design/,
    // Development URLs
    /localhost/,
    // Old file references
    /\/setup-website\.sh/,
    /\/index$/,
    /\/getting-started-/,
    /\/architecture-overview/,
    /\/NPM_PUBLISHING/,
    /\/USAGE_GUIDE/,
    /\/architecture-decisions/,
    /\/adrs\/index/
  ],
  
  head: [
    ['link', { rel: 'icon', href: '/logo.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/logo.png' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'MCP ADR Analysis Server' }],
    ['meta', { name: 'og:image', content: '/og-image.png' }],
  ],

  themeConfig: {
    logo: '/logo.png',
    
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get Started', link: '/diataxis-index' },
      { 
        text: 'Documentation', 
        items: [
          { text: '🎓 Tutorials', link: '/tutorials/01-first-steps' },
          { text: '🛠️ How-To Guides', link: '/how-to-guides/troubleshooting' },
          { text: '📖 Reference', link: '/reference/api-reference' },
          { text: '💡 Explanation', link: '/explanation/mcp-concepts' }
        ]
      },
      { text: 'GitHub', link: 'https://github.com/tosin2013/mcp-adr-analysis-server' }
    ],

    sidebar: {
      '/': [
        {
          text: '🧭 Navigation',
          collapsed: false,
          items: [
            { text: 'Documentation Navigator', link: '/diataxis-index' },
            { text: 'Quick Start', link: '/README' }
          ]
        },
        {
          text: '🎓 Tutorials',
          collapsed: false,
          items: [
            { text: 'Your First MCP Analysis', link: '/tutorials/01-first-steps' },
            { text: 'Working with Existing Projects', link: '/tutorials/02-existing-projects' },
            { text: 'Advanced Analysis Techniques', link: '/tutorials/03-advanced-analysis' }
          ]
        },
        {
          text: '🛠️ How-To Guides',
          collapsed: false,
          items: [
            { text: 'Troubleshoot Issues', link: '/how-to-guides/troubleshooting' },
            { text: 'Generate ADRs from PRD', link: '/how-to-guides/generate-adrs-from-prd' },
            { text: 'Work with Existing ADRs', link: '/how-to-guides/work-with-existing-adrs' },
            { text: 'Bootstrap Architecture Docs', link: '/how-to-guides/bootstrap-architecture-docs' },
            { text: 'Deploy Your Own Server', link: '/how-to-guides/deploy-your-own-server' },
            { text: 'APE Framework Implementation', link: '/how-to-guides/ape-implementation-strategy' },
            { text: 'APE Usage Guide', link: '/how-to-guides/ape-usage-guide' },
            { text: 'Reflexion Implementation', link: '/how-to-guides/reflexion-implementation-strategy' },
            { text: 'Reflexion Usage Guide', link: '/how-to-guides/reflexion-usage-guide' },
            { text: 'Knowledge Generation Usage', link: '/how-to-guides/knowledge-generation-usage-guide' },
            { text: 'Workflow Guidance', link: '/how-to-guides/getting-started-workflow-guidance' }
          ]
        },
        {
          text: '📖 Reference',
          collapsed: false,
          items: [
            { text: 'Complete API Reference', link: '/reference/api-reference' },
            { text: 'Usage Examples', link: '/reference/usage-examples' }
          ]
        },
        {
          text: '💡 Explanation',
          collapsed: false,
          items: [
            { text: 'Understanding MCP', link: '/explanation/mcp-concepts' },
            { text: 'Server Architecture', link: '/explanation/server-architecture' },
            { text: 'Architecture Flow Diagrams', link: '/explanation/mcp-architecture-flow' },
            { text: 'AI Workflow Concepts', link: '/explanation/ai-workflow-concepts' },
            { text: 'APE Framework Design', link: '/explanation/ape-framework-design' },
            { text: 'Reflexion Framework Design', link: '/explanation/reflexion-framework-design' },
            { text: 'Knowledge Generation Framework', link: '/explanation/knowledge-generation-framework-design' }
          ]
        },
        {
          text: '🔧 IDE Rules',
          collapsed: true,
          items: [
            { text: 'Overview', link: '/ide-rules/README' },
            { text: 'Quickstart Guide', link: '/ide-rules/quickstart-guide' },
            { text: 'Universal Workflows', link: '/ide-rules/universal-workflows' },
            { text: 'Environment Validation', link: '/ide-rules/environment-validation-workflow' },
            { text: 'Command Structure', link: '/ide-rules/command-structure' },
            { text: 'Additional Workflows', link: '/ide-rules/additional-workflows' },
            { text: 'Standalone Usage', link: '/ide-rules/standalone-usage' },
            {
              text: 'IDE-Specific',
              collapsed: true,
              items: [
                { text: 'Cursor', link: '/ide-rules/ide-specific/cursor/cursor-rules-template' },
                { text: 'VS Code', link: '/ide-rules/ide-specific/vscode/vscode-rules-template' },
                { text: 'JetBrains', link: '/ide-rules/ide-specific/jetbrains/jetbrains-rules-template' },
                { text: 'Windsurf', link: '/ide-rules/ide-specific/windsurf/windsurf-rules-template' }
              ]
            }
          ]
        }
      ]
    },

    editLink: {
      pattern: 'https://github.com/tosin2013/mcp-adr-analysis-server/edit/main/docs/:path'
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Tosin Akinosho'
    },

    search: {
      provider: 'local',
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: 'Search docs',
            buttonAriaLabel: 'Search docs'
          },
          modal: {
            searchBox: {
              resetButtonTitle: 'Clear search',
              resetButtonAriaLabel: 'Clear search',
              cancelButtonText: 'Cancel',
              cancelButtonAriaLabel: 'Cancel'
            },
            startScreen: {
              recentSearchesTitle: 'Recent searches',
              noRecentSearchesText: 'No recent searches',
              saveRecentSearchButtonTitle: 'Save this search',
              removeRecentSearchButtonTitle: 'Remove this search from history',
              favoriteSearchesTitle: 'Favorites',
              removeFavoriteSearchButtonTitle: 'Remove this search from favorites'
            },
            errorScreen: {
              titleText: 'Unable to fetch results',
              helpText: 'You might want to check your network connection.'
            }
          }
        }
      }
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tosin2013/mcp-adr-analysis-server' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/mcp-adr-analysis-server' }
    ]
  },

  markdown: {
    lineNumbers: true,
    image: {
      lazyLoading: true
    }
  }
}))
