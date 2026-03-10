import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class CrossEngineIndexController extends Controller {
    @service('node-context') nodeContext;
    @service('cityos') cityosService;
    @tracked engineStats = null;
    @tracked isLoading = false;

    get hasContext() {
        return this.nodeContext.hasContext;
    }

    get contextBreadcrumb() {
        return this.nodeContext.contextBreadcrumb;
    }

    get contextDepth() {
        return this.nodeContext.contextDepth;
    }

    get engines() {
        return [
            { name: 'FleetOps', icon: 'truck', color: 'blue', route: 'console.cityos.cross-engine.fleetops', description: 'Orders, drivers, vehicles, service areas', scoping: ['country', 'city', 'tenant'], bgClass: 'bg-blue-100 dark:bg-blue-900', iconClass: 'text-blue-600 dark:text-blue-400', hoverClass: 'hover:border-blue-300 dark:hover:border-blue-600' },
            { name: 'Pallet WMS', icon: 'warehouse', color: 'amber', route: 'console.cityos.cross-engine.pallet', description: 'Warehouses, products, inventory', scoping: ['country', 'city', 'tenant'], bgClass: 'bg-amber-100 dark:bg-amber-900', iconClass: 'text-amber-600 dark:text-amber-400', hoverClass: 'hover:border-amber-300 dark:hover:border-amber-600' },
            { name: 'Storefront', icon: 'store', color: 'green', route: 'console.cityos.cross-engine.storefront', description: 'Products, orders, networks, channels', scoping: ['tenant', 'channel', 'surface'], bgClass: 'bg-green-100 dark:bg-green-900', iconClass: 'text-green-600 dark:text-green-400', hoverClass: 'hover:border-green-300 dark:hover:border-green-600' },
            { name: 'IAM', icon: 'shield-halved', color: 'red', route: 'console.cityos.cross-engine.iam', description: 'Roles, users, clearance levels', scoping: ['tenant'], bgClass: 'bg-red-100 dark:bg-red-900', iconClass: 'text-red-600 dark:text-red-400', hoverClass: 'hover:border-red-300 dark:hover:border-red-600' },
        ];
    }

    constructor() {
        super(...arguments);
        this.loadEngineStats();
    }

    @action
    async loadEngineStats() {
        this.isLoading = true;
        try {
            const response = await this.cityosService.loadStats();
            this.engineStats = response;
        } catch (e) {}
        this.isLoading = false;
    }
}
