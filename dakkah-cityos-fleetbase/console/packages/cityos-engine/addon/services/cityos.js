import Service from '@ember/service';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { getOwner } from '@ember/application';

export default class CityosService extends Service {
    @service fetch;
    @tracked hierarchyTree = null;
    @tracked integrationStatus = null;
    @tracked stats = null;
    @tracked _contextHeadersInstalled = false;

    get baseUrl() {
        return 'cityos/int/v1';
    }

    get nodeContext() {
        try {
            return getOwner(this).lookup('service:node-context');
        } catch (e) {
            return null;
        }
    }

    get contextHeaders() {
        return this.nodeContext?.contextHeaders || {};
    }

    installContextHeaders() {
        if (this._contextHeadersInstalled) return;
        try {
            const nodeCtx = this.nodeContext;
            if (!nodeCtx) return;
            const fetchService = this.fetch;
            const originalGetHeaders = fetchService.getHeaders.bind(fetchService);
            fetchService.getHeaders = function (...args) {
                const headers = originalGetHeaders(...args);
                try {
                    const ctx = nodeCtx.contextHeaders;
                    if (ctx && typeof ctx === 'object') {
                        Object.assign(headers, ctx);
                    }
                } catch (e) {
                    // context not available yet
                }
                return headers;
            };
            this._contextHeadersInstalled = true;
        } catch (e) {
            // silent
        }
    }

    async loadHierarchyTree() {
        try {
            const response = await this.fetch.get('cityos/v1/hierarchy/tree');
            this.hierarchyTree = response?.hierarchy || [];
            return this.hierarchyTree;
        } catch (e) {
            return [];
        }
    }

    async loadStats() {
        try {
            const response = await this.fetch.get(`${this.baseUrl}/hierarchy/stats`);
            this.stats = response?.counts || {};
            return this.stats;
        } catch (e) {
            return {};
        }
    }

    async resolveContext(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            const response = await this.fetch.get(`cityos/v1/hierarchy/resolve?${queryStr}`);
            return response;
        } catch (e) {
            return null;
        }
    }

    async loadIntegrationStatus() {
        try {
            const response = await this.fetch.get(`${this.baseUrl}/integrations/status`);
            this.integrationStatus = response?.integrations || {};
            return this.integrationStatus;
        } catch (e) {
            return {};
        }
    }

    async getTemporalConnection() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/temporal/connection`);
        } catch (e) {
            return { configured: false, error: e.message };
        }
    }

    async getTemporalWorkflows(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/integrations/temporal/workflows?${queryStr}`);
        } catch (e) {
            return { executions: [], error: e.message };
        }
    }

    async startTemporalWorkflow(data) {
        try {
            return await this.fetch.post(`${this.baseUrl}/integrations/temporal/workflows/start`, data);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async describeTemporalWorkflow(workflowId, runId) {
        try {
            const params = runId ? `?run_id=${runId}` : '';
            return await this.fetch.get(`${this.baseUrl}/integrations/temporal/workflows/${workflowId}${params}`);
        } catch (e) {
            return { error: e.message };
        }
    }

    async signalTemporalWorkflow(workflowId, signalName, payload = {}) {
        try {
            return await this.fetch.post(`${this.baseUrl}/integrations/temporal/workflows/${workflowId}/signal`, {
                signal_name: signalName,
                payload,
            });
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async terminateTemporalWorkflow(workflowId) {
        try {
            return await this.fetch.post(`${this.baseUrl}/integrations/temporal/workflows/${workflowId}/terminate`, {});
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getTemporalRegistry(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/integrations/temporal/registry?${queryStr}`);
        } catch (e) {
            return { data: [], error: e.message };
        }
    }

    async getTemporalRegistryStats() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/temporal/registry/stats`);
        } catch (e) {
            return {};
        }
    }

    async triggerTemporalSync() {
        try {
            return await this.fetch.post(`${this.baseUrl}/integrations/temporal/sync/trigger`, {});
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getTemporalSyncStatus() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/temporal/sync/status`);
        } catch (e) {
            return {};
        }
    }

    async getCMSHealth() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/cms/health`);
        } catch (e) {
            return { connected: false, error: e.message };
        }
    }

    async getCMSCollections() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/cms/collections`);
        } catch (e) {
            return {};
        }
    }

    async getCMSNodes() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/cms/nodes`);
        } catch (e) {
            return {};
        }
    }

    async getCMSStorage() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/cms/storage/info`);
        } catch (e) {
            return {};
        }
    }

    async getERPNextStatus() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/erpnext/status`);
        } catch (e) {
            return { mode: 'unavailable', error: e.message };
        }
    }

    async triggerSettlement(data = {}) {
        try {
            return await this.fetch.post(`${this.baseUrl}/integrations/erpnext/settlement`, data);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getOutboxStats() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/outbox/stats`);
        } catch (e) {
            return {};
        }
    }

    async getOutboxRecent(limit = 20) {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/outbox/recent?limit=${limit}`);
        } catch (e) {
            return [];
        }
    }

    async dispatchOutbox(batchSize = 50) {
        try {
            return await this.fetch.post(`${this.baseUrl}/integrations/outbox/dispatch`, { batch_size: batchSize });
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async publishOutboxEvent(eventType, payload, nodeContext = {}, tenantId = null) {
        try {
            return await this.fetch.post(`${this.baseUrl}/integrations/outbox/publish`, {
                event_type: eventType,
                payload,
                node_context: nodeContext,
                tenant_id: tenantId,
            });
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getIntegrationLogs(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/integrations/logs?${queryStr}`);
        } catch (e) {
            return [];
        }
    }

    async resolveGovernanceChain(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/governance/resolve?${queryStr}`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getTenantHierarchy(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/governance/tenant-hierarchy?${queryStr}`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async checkCompliance(tenant, operation = 'read') {
        try {
            return await this.fetch.get(`${this.baseUrl}/governance/compliance?tenant=${tenant}&operation=${operation}`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async evaluateFeatureFlags(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/governance/feature-flags?${queryStr}`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getNodeTree(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/governance/node-tree?${queryStr}`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getFeatureGateMatrix(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/governance/feature-gate-matrix?${queryStr}`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async toggleFeatureGate(featureKey, tenantTier, enabled) {
        try {
            return await this.fetch.post(`${this.baseUrl}/governance/feature-gate-toggle`, {
                feature_key: featureKey,
                tenant_tier: tenantTier,
                enabled,
            });
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getEventBridgeStream(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/integrations/outbox/recent?${queryStr}`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getEventBridgeStats() {
        try {
            return await this.fetch.get(`${this.baseUrl}/integrations/outbox/stats`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getAuditTrail(params = {}) {
        try {
            const queryStr = new URLSearchParams(params).toString();
            return await this.fetch.get(`${this.baseUrl}/integrations/outbox/recent?${queryStr}&limit=50`);
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    async getScopingStatus() {
        try {
            return await this.fetch.get(`${this.baseUrl}/cross-engine/status`);
        } catch (e) {
            return {
                success: true,
                scoping_enabled: true,
                feature_gates_enabled: false,
                event_bridge_enabled: false,
            };
        }
    }
}
