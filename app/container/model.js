import Ember from 'ember';
import Resource from 'ember-api-store/models/resource';

var Container = Resource.extend({
  // Common to all instances
  requestedHostId: null,
  primaryIpAddress: null,
  primaryAssociatedIpAddress: null,

  // Container-specific
  type: 'container',
  imageUuid: null,
  registryCredentialId: null,
  command: null,
  commandArgs: null,
  environment: null,
  ports: null,
  instanceLinks: null,
  dataVolumes: null,
  dataVolumesFrom: null,
  devices: null,
  restartPolicy: null,

  // Hacks
  hasManagedNetwork: function() {
    return this.get('primaryIpAddress') && this.get('primaryIpAddress').indexOf('10.') === 0;
  }.property('primaryIpAddress'),

  combinedState: function() {
    var resource = this.get('state');
    var health = this.get('healthState');

    if ( ['running','active','updating-active'].indexOf(resource) >= 0 )
    {
      if ( health === null || health === 'healthy' )
      {
        return resource;
      }
      else
      {
        return health;
      }
    }
    else
    {
      return resource;
    }
  }.property('state', 'healthState'),

  isOn: function() {
    return ['running','updating-running','migrating','restarting'].indexOf(this.get('state')) >= 0;
  }.property('state'),

  displayIp: function() {
    return this.get('primaryAssociatedIpAddress') || this.get('primaryIpAddress') || new Ember.Handlebars.SafeString('<span class="text-muted">None</span>');
  }.property('primaryIpAddress','primaryAssociatedIpAddress'),

  canDelete: function() {
    return ['removed','removing','purging','purged'].indexOf(this.get('state')) === -1;
  }.property('state'),

  isManaged: Ember.computed.notEmpty('systemContainer'),
  primaryHost: Ember.computed.alias('hosts.firstObject'),
});

Container.reopenClass({
  alwaysInclude: ['hosts'],

  mangleIn: function(data) {
    if ( data.labels )
    {
      // Labels shouldn't be a model even if it has a key called 'type'
      data.labels = JSON.parse(JSON.stringify(data.labels));
    }

    return data;
  },
});

export default Container;
