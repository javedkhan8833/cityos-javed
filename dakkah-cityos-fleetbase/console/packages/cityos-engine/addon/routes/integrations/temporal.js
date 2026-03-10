import Route from '@ember/routing/route';

export default class IntegrationsTemporalRoute extends Route {
    async model() {
        try {
            const response = await fetch('/cityos/int/v1/integrations/temporal/connection');
            return await response.json();
        } catch (e) {
            return {};
        }
    }
}
