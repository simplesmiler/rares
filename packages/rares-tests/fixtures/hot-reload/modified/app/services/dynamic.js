module.exports = App => class DynamicService {
  static async get() {
    return { message: 'dynamic-modified' };
  }
};
