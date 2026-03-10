'use strict';

module.exports = function (environment) {
    let ENV = {
        modulePrefix: 'dummy',
        environment,
        rootURL: '/',
        locationType: 'history',
        EmberENV: {
            EXTEND_PROTOTYPES: false,
            FEATURES: {},
        },
        APP: {},
    };

    return ENV;
};
