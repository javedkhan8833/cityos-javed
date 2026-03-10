import Route from '@ember/routing/route';

export default class IntegrationsIndexRoute extends Route {
    async model() {
        try {
            const response = await fetch('/cityos/int/v1/integrations/status');
            const data = await response.json();
            return data.integrations || {};
        } catch (e) {
            return {};
        }
    }
}
