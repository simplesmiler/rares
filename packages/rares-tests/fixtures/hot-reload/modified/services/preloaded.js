module.exports = App => class PreloadedService {
  static async get() {
    return { message: 'preloaded-modified' };
  }
};
