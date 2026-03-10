import buildRoutes from 'ember-engines/routes';

export default buildRoutes(function () {
    this.route('home', { path: '/' });
    this.route('hierarchy', function () {
        this.route('index', { path: '/' });
        this.route('countries', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
        this.route('cities', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
        this.route('sectors', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
        this.route('categories', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
        this.route('regions', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
        this.route('nodes', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
    });
    this.route('tenants', function () {
        this.route('index', { path: '/' });
        this.route('details', { path: '/:public_id' });
    });
    this.route('channels', function () {
        this.route('index', { path: '/' });
        this.route('details', { path: '/:public_id' });
    });
    this.route('surfaces', function () {
        this.route('index', { path: '/' });
        this.route('details', { path: '/:public_id' });
    });
    this.route('portals', function () {
        this.route('index', { path: '/' });
        this.route('details', { path: '/:public_id' });
    });
    this.route('integrations', function () {
        this.route('index', { path: '/' });
        this.route('temporal');
        this.route('cms');
        this.route('erpnext');
        this.route('outbox');
        this.route('logs');
    });
    this.route('governance', function () {
        this.route('index', { path: '/' });
        this.route('authorities', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
        this.route('policies', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
        this.route('feature-flags', function () {
            this.route('index', { path: '/' });
            this.route('details', { path: '/:public_id' });
        });
        this.route('compliance');
        this.route('residency');
    });
    this.route('cross-engine', function () {
        this.route('index', { path: '/' });
        this.route('fleetops');
        this.route('pallet');
        this.route('storefront');
        this.route('iam');
        this.route('feature-gates');
        this.route('event-bridge');
        this.route('audit-trail');
    });
});
