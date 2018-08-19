module.exports = {
  base: '/rares/',
  title: 'Rares',
  description: 'Modern backend framework',
  themeConfig: {
    repo: 'simplesmiler/rares',
    repoLabel: 'Contribute!',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Improve this page!',
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API Reference', link: '/reference/' },
    ],
    sidebar: [
      '/guide/',
      '/reference/',
    ],
  },
};
