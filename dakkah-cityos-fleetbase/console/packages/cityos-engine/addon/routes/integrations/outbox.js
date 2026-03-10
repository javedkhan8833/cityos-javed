import Route from '@ember/routing/route';

export default class IntegrationsOutboxRoute extends Route {
    async model() {
        try {
            const response = await fetch('/cityos/int/v1/integrations/outbox/stats');
            return await response.json();
        } catch (e) {
            return { pending: 0, dispatched: 0, failed: 0, events: [] };
        }
    }
}
