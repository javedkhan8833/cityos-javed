import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class HomeRoute extends Route {
    @service store;

    async model() {
        const fetchTree = fetch('/cityos/v1/hierarchy/tree').then(r => r.json()).catch(() => ({ hierarchy: [] }));
        const fetchStatus = fetch('/cityos/int/v1/integrations/status', {
            headers: { 'Authorization': `Bearer ${this.session?.data?.authenticated?.token || ''}` }
        }).then(r => r.json()).catch(() => ({ integrations: {} }));

        const [treeData, statusData] = await Promise.all([fetchTree, fetchStatus]);
        return { tree: treeData.hierarchy || [], integrations: statusData.integrations || {} };
    }
}
