import Route from '@ember/routing/route';

export default class HierarchyIndexRoute extends Route {
    async model() {
        try {
            const response = await fetch('/cityos/v1/hierarchy/tree');
            const data = await response.json();
            return data.hierarchy || [];
        } catch (e) {
            return [];
        }
    }
}
