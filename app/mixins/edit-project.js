import Ember from 'ember';
import C from 'ui/utils/constants';
import Util from 'ui/utils/util';
import NewOrEdit from 'ui/mixins/new-or-edit';

export default Ember.Mixin.create(NewOrEdit, {
  projects: Ember.inject.service(),

  actions: {
    checkMember: function(obj) {
      var member = this.get('store').createRecord({
        type: 'projectMember',
        externalId: obj.get('id'),
        externalIdType: C.PROJECT.FROM_GITHUB[ obj.get('type') ],
        role: (this.get('model.projectMembers.length') === 0 ? C.PROJECT.ROLE_OWNER : C.PROJECT.ROLE_MEMBER)
      });

      var existing = this.get('model.projectMembers')
                      .filterProperty('externalIdType', member.get('externalIdType'))
                      .filterProperty('externalId', member.get('externalId'));

      if ( existing.get('length') )
      {
        this.send('error','Member is already in the list');
        return;
      }

      this.send('error',null);
      this.get('model.projectMembers').pushObject(member);
    },

    removeMember: function(item) {
      this.get('model.projectMembers').removeObject(item);
    },
  },

  roleOptions: function() {
    return this.get('store').getById('schema','projectmember').get('resourceFields.role.options').map((role) => {
      return {
        label: Util.ucFirst(role),
        value: role
      };
    });
  }.property(),

  hasOwner: function() {
    return this.get('model.projectMembers').filterProperty('role', C.PROJECT.ROLE_OWNER).get('length') > 0;
  }.property('model.projectMembers.@each.role'),

  validate: function() {
    this._super();
    var errors = this.get('errors')||[];

    if ( !this.get('hasOwner') && this.get('app.authenticationEnabled') )
    {
      errors.push('You must add at least one owner');
    }

    if ( errors.length )
    {
      this.set('errors', errors);
      return false;
    }

    return true;
  },

  doneSaving: function() {
    var out = this._super();
    this.get('projects').refreshAll();
    return out;
  },
});
