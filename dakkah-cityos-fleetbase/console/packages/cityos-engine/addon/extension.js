export default {
    setupExtension(app, universe) {
        const menuService = universe.getService('menu');

        menuService.registerHeaderMenuItem('CityOS', 'console.cityos', { icon: 'city', iconPrefix: 'fas', priority: 2, id: 'cityos', slug: 'cityos' });
    },
};
