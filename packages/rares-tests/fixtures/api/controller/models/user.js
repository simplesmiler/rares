module.exports = App => {
  class User {
    constructor(id, name) {
      this.id = id;
      this.name = name;
    }
    static async find(id) {
      return users.find(user => String(user.id) === String(id));
    }
  }
  const users = [
    new User(1, 'John'),
    new User(2, 'Jane'),
  ];

  return User;
};
