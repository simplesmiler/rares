const _ = require('lodash');

module.exports = class Ability {

  constructor() {
    this.$queue = [];
  }

  async $can(action, subject) {
    for (const entry of this.$queue) {
      const entryActions = _.castArray(_.get(entry, 'action', []));
      const actionMatches = _.some(entryActions, entryAction => {
        return entryAction == 'manage'
          || entryAction == 'crud' && ['create', 'read', 'update', 'destroy'].includes(action)
          || entryAction == action;
      });

      if (!actionMatches) continue;

      const entrySubjects = _.castArray(_.get(entry, 'subject', []));
      const subjectMatches = _.some(entrySubjects, entrySubject => {
        return entrySubject == 'all' // covers wildcard
          || entrySubject == subject // covers model -> model and string -> string
          || _.isFunction(entrySubject) && subject instanceof entrySubject; // covers model -> record
      });

      if (!subjectMatches) continue;

      // @NOTE: authorizing a class (as opposed to a record) while predicate is present -> not allowed
      // @NOTE: this is different from how cancancan works
      if (_.isFunction(subject) && entry.predicate != null) {
        continue;
      }

      // @NOTE: function predicate -> allowed if returns truthy value
      else if (_.isFunction(entry.predicate)) {
        const allowed = await entry.predicate.call(this, action, subject);
        if (allowed) return true;
      }

      // @NOTE: object predicate -> allowed if all present object fields match
      else if (_.isPlainObject(entry.predicate)) {
        const subjectExtract = _.pick(subject, _.keys(entry.predicate));
        const allowed = _.isEqual(entry.predicate, subjectExtract);
        if (allowed) return true;
      }

      // @TODO: support hash conditions

      // @NOTE: no predicate -> allowed
      else if (entry.predicate == null) {
        return true;
      }

      else {
        // @NOTE: don't stop execution, just warn and skip
        console.warn(`${this.constructor.name} has an entry with incorrect type of predicate: '${typeof entry.predicate}'`);
      }
    }

    return false;
  }

  static async $for(user) {
    const ability = new this();
    if (!ability.$initialize) {
      throw new Error(`${this.name} does not have $initialize method`);
    }
    await ability.$initialize(user, (action, subject, predicate) => {
      ability.$queue.push({ action, subject, predicate });
    });
    return ability;
  }

};
