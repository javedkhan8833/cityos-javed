import Engine from '@ember/engine';
import loadInitializers from 'ember-load-initializers';
import Resolver from 'ember-resolver';
import config from './config/environment';
import { services, externalRoutes } from '@fleetbase/ember-core/exports';

const { modulePrefix } = config;
export default class CityosEngine extends Engine {
    modulePrefix = modulePrefix;
    Resolver = Resolver;
    dependencies = {
        services,
        externalRoutes,
    };
    setupExtension = function (app, engine, universe) {
        universe.registerHeaderMenuItem('CityOS', 'console.cityos', { icon: 'city', priority: 2 });

        const cityosService = engine.lookup ? engine.lookup('service:cityos') : null;
        if (cityosService && typeof cityosService.installContextHeaders === 'function') {
            cityosService.installContextHeaders();
        }
    };
}

loadInitializers(CityosEngine, modulePrefix);
