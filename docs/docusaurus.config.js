// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer').themes.github;
const darkCodeTheme = require('prism-react-renderer').themes.dracula;

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'MCP ADR Analysis Server',
  tagline: 'AI-powered architectural analysis for intelligent development workflows',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://tosin2013.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  baseUrl: '/mcp-adr-analysis-server/',

  // GitHub pages deployment config
  organizationName: 'tosin2013',
  projectName: 'mcp-adr-analysis-server',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: '.',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/tosin2013/mcp-adr-analysis-server/edit/main/docs/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
          exclude: [
            '**/node_modules/**',
            '**/.docusaurus/**',
            '**/build/**',
            '**/static/**',
            '**/src/**',
            '**/*.config.js',
            '**/*.config.ts',
            '**/package.json',
            '**/package-lock.json',
            '**/Dockerfile',
            '**/docker-compose.yml',
            '**/.dockerignore',
            '**/Makefile',
            '**/nginx.conf',
            '**/.vitepress/**',
            '**/public/**',
            '**/notes/**', // Internal development notes, not end-user docs
          ],
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/og-image.png',
      navbar: {
        title: 'MCP ADR Analysis Server',
        logo: {
          alt: 'MCP ADR Analysis Server Logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'how-to-guides/installation-guide',
            position: 'left',
            label: '🚀 Get Started',
          },
          {
            type: 'doc',
            docId: 'tutorials/index',
            position: 'left',
            label: '🎓 Tutorials',
          },
          {
            type: 'doc',
            docId: 'how-to/index',
            position: 'left',
            label: '🛠️ How-To',
          },
          {
            type: 'dropdown',
            label: '📖 Reference',
            position: 'left',
            items: [
              {
                type: 'doc',
                docId: 'reference/api-reference',
                label: 'API Reference',
              },
              {
                type: 'doc',
                docId: 'reference/analysis-tools',
                label: 'Analysis Tools',
              },
            ],
          },
          {
            type: 'doc',
            docId: 'explanation/index',
            position: 'left',
            label: '💡 Explanation',
          },
          {
            href: 'https://github.com/tosin2013/mcp-adr-analysis-server',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://www.npmjs.com/package/mcp-adr-analysis-server',
            label: 'npm',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Get Started',
                to: '/diataxis-index',
              },
              {
                label: 'Tutorials',
                to: '/tutorials/01-first-steps',
              },
              {
                label: 'API Reference',
                to: '/reference/api-reference',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub Discussions',
                href: 'https://github.com/tosin2013/mcp-adr-analysis-server/discussions',
              },
              {
                label: 'Issues',
                href: 'https://github.com/tosin2013/mcp-adr-analysis-server/issues',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/tosin2013/mcp-adr-analysis-server',
              },
              {
                label: 'npm Package',
                href: 'https://www.npmjs.com/package/mcp-adr-analysis-server',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Tosin Akinosho. Released under the MIT License.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'json', 'typescript', 'javascript', 'yaml'],
      },
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
    }),

  markdown: {
    mermaid: true,
  },
  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        docsRouteBasePath: '/',
      },
    ],
  ],
};

module.exports = config;
