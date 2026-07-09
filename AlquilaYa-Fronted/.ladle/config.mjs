/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: 'src/**/*.stories.{ts,tsx}',
  addons: {
    theme: {
      enabled: true,
      defaultState: 'light',
    },
    a11y: {
      enabled: true,
    },
    width: {
      enabled: true,
      options: {
        xsmall: 400,
        small: 640,
        medium: 768,
        large: 1024,
        xlarge: 1440,
      },
      defaultState: 0,
    },
  },
};
