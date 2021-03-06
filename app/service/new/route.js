import Ember from 'ember';

export default Ember.Route.extend({
  allServices: Ember.inject.service(),

  actions: {
    cancel: function() {
      this.goToPrevious();
    },
  },

  model: function(params/*, transition*/) {
    var store = this.get('store');

    var dependencies = [
      store.findAll('host'), // Need inactive ones in case a link points to an inactive host
      this.get('allServices').choices(),
    ];

    if ( params.serviceId )
    {
      dependencies.pushObject(store.find('service', params.serviceId));
    }
    else if ( params.containerId )
    {
      dependencies.pushObject(store.find('container', params.containerId, {include: ['ports']}));
    }

    return Ember.RSVP.all(dependencies, 'Load container dependencies').then((results) => {
      var allHosts = results[0];
      var allServices = results[1];
      var serviceOrContainer = results[2];
      var serviceLinks = [];

      var instanceData, serviceData, healthCheckData;
      if ( serviceOrContainer )
      {
        if ( serviceOrContainer.get('type') === 'service' )
        {
          serviceData = serviceOrContainer.serializeForNew();
          serviceLinks = serviceOrContainer.get('consumedServicesWithNames');
          instanceData = serviceData.launchConfig;
          delete serviceData.launchConfig;
          delete serviceData.instances;
          delete serviceData.secondaryLaunchConfigs;
        }
        else
        {
          instanceData = serviceOrContainer.serializeForNew();
        }

        healthCheckData = instanceData.healthCheck;
      }
      else
      {
        instanceData = {
          type: 'container',
          tty: true,
          stdinOpen: true,
        };
      }

      if ( !serviceData )
      {
        serviceData = {
          type: 'service',
          environmentId: params.environmentId,
          scale: 1,
        };
      }

      if ( !healthCheckData )
      {
        healthCheckData = {
          interval: 2000,
          responseTimeout: 2000,
          healthyThreshold: 2,
          unhealthyThreshold: 3,
          requestLine: null,
        };
      }

      // The type isn't set on an existing one
      healthCheckData.type = 'instanceHealthCheck';

      var instance = this.get('store').createRecord(instanceData);

      var service = store.createRecord(serviceData);
      service.set('serviceLinks', serviceLinks);

      var healthCheck = store.createRecord(healthCheckData);
      instance.set('healthCheck', healthCheck);
      service.set('launchConfig', instance); // Creating a service needs the isntance definition here

      return Ember.Object.create({
        isService: true,
        service: service,
        healthCheck: healthCheck,
        instance: instance, // but mixins/edit-container expects to find the instance here, so link both to the same object
        allHosts: allHosts,
        allServices: allServices,
      });
    });
  },

  setupController: function(controller, model) {
    controller.set('originalModel', null);
    controller.set('model', model);
    controller.initFields();
  },

  resetController: function (controller, isExiting/*, transition*/) {
    if (isExiting)
    {
      controller.set('tab', 'command');
      controller.set('advanced', false);
      controller.set('environmentId', null);
      controller.set('serviceId', null);
      controller.set('containerId', null);
    }
  }
});
