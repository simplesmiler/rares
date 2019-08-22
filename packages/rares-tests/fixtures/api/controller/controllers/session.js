module.exports = App => class extends App.load('controllers/application') {
  async show() {
    return { currentUser: this.currentUser || null };
  }

  async create() {
    const User = App.load('models/user');
    //
    const userId = this.$params.userId;
    const user = await User.find(userId);
    //
    if (user) {
      await this.$store('userId', this.$params.userId);
      return { currentUser: user };
    }
    else {
      return this.$response({ message: 'No such user' }, { status: 409 });
    }
  }

  async destroy() {
    await this.$clear('userId');
    return { currentUser: null };
  }
};
