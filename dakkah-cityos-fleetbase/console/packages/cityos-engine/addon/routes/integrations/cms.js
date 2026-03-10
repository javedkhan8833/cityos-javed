import Route from '@ember/routing/route';

export default class IntegrationsCmsRoute extends Route {
    async model() {
        try {
            const response = await fetch('/cityos/int/v1/integrations/cms/health');
            return await response.json();
        } catch (e) {
            return {};
        }
    }
}
