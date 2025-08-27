import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  extra: {
    BASE_URL: `http://${process.env.USER_IP}:4000`,
  },
});
