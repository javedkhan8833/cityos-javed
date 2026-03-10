<?php

use Illuminate\Support\Facades\Route;

Route::prefix(config('cityos.api.routing.prefix', 'cityos'))->namespace('Fleetbase\CityOS\Http\Controllers')->group(
    function ($router) {
        $router->prefix(config('cityos.api.routing.internal_prefix', 'int'))->group(
            function ($router) {
                $router->group(
                    ['prefix' => 'v1', 'middleware' => ['fleetbase.protected']],
                    function ($router) {
                        $router->fleetbaseRoutes('countries');
                        $router->fleetbaseRoutes('cities');
                        $router->fleetbaseRoutes('sectors');
                        $router->fleetbaseRoutes('categories');
                        $router->fleetbaseRoutes('tenants', function ($router, $controller) {
                            $router->get('{id}/node-context', $controller('getNodeContext'));
                        });
                        $router->fleetbaseRoutes('channels');
                        $router->fleetbaseRoutes('surfaces');
                        $router->fleetbaseRoutes('portals');

                        $router->fleetbaseRoutes('regions');
                        $router->fleetbaseRoutes('governance-authorities');
                        $router->fleetbaseRoutes('policies');
                        $router->fleetbaseRoutes('feature-flags');
                        $router->fleetbaseRoutes('nodes');

                        $router->get('hierarchy/tree', 'HierarchyController@tree');
                        $router->get('hierarchy/resolve', 'HierarchyController@resolve');
                        $router->get('hierarchy/stats', 'HierarchyController@stats');

                        $router->prefix('governance')->group(function ($router) {
                            $router->get('resolve', 'GovernanceController@resolve');
                            $router->get('tenant-hierarchy', 'GovernanceController@tenantHierarchy');
                            $router->get('compliance', 'GovernanceController@compliance');
                            $router->get('feature-flags', 'GovernanceController@featureFlags');
                            $router->get('node-tree', 'GovernanceController@nodeTree');
                        });

                        $router->prefix('outbox-events')->group(function ($router) {
                            $router->get('stats', 'OutboxEventController@stats');
                            $router->post('retry-all-failed', 'OutboxEventController@retryAllFailed');
                            $router->get('/', 'OutboxEventController@index');
                            $router->get('{id}', 'OutboxEventController@show');
                            $router->post('{id}/retry', 'OutboxEventController@retry');
                            $router->post('{id}/dead-letter', 'OutboxEventController@deadLetter');
                            $router->delete('{id}', 'OutboxEventController@destroy');
                        });

                        $router->prefix('integration-logs')->group(function ($router) {
                            $router->get('stats', 'IntegrationLogController@stats');
                            $router->delete('purge', 'IntegrationLogController@purge');
                            $router->get('/', 'IntegrationLogController@index');
                            $router->get('{id}', 'IntegrationLogController@show');
                        });

                        $router->prefix('identity')->group(function ($router) {
                            $router->get('status', 'WaltIdController@status');
                            $router->get('dids', 'WaltIdController@listDids');
                            $router->post('dids', 'WaltIdController@createDid');
                            $router->get('dids/{did}', 'WaltIdController@resolveDid');
                            $router->delete('dids/{did}', 'WaltIdController@deactivateDid');
                            $router->post('credentials/issue', 'WaltIdController@issueCredential');
                            $router->post('credentials/verify', 'WaltIdController@verifyCredential');
                            $router->post('presentations/create', 'WaltIdController@createPresentation');
                            $router->post('presentations/verify', 'WaltIdController@verifyPresentation');
                            $router->get('templates', 'WaltIdController@listTemplates');
                            $router->post('keys/generate', 'WaltIdController@generateKey');
                        });

                        $router->prefix('workflows')->group(function ($router) {
                            $router->get('dashboard', 'WorkflowDashboardController@dashboard');
                            $router->get('definitions', 'WorkflowDashboardController@definitions');
                            $router->get('activity-log', 'WorkflowDashboardController@activityLog');
                            $router->post('start', 'WorkflowDashboardController@start');
                            $router->get('executions', 'WorkflowDashboardController@executions');
                            $router->get('executions/{id}', 'WorkflowDashboardController@executionDetail');
                            $router->post('executions/{id}/cancel', 'WorkflowDashboardController@cancel');
                            $router->post('executions/{id}/terminate', 'WorkflowDashboardController@terminate');
                        });

                        $router->prefix('cms')->group(function ($router) {
                            $router->prefix('sync')->group(function ($router) {
                                $router->get('status', 'CmsSyncDashboardController@status');
                                $router->get('history', 'CmsSyncDashboardController@history');
                                $router->post('trigger', 'CmsSyncDashboardController@trigger');
                                $router->get('conflicts', 'CmsSyncDashboardController@conflicts');
                                $router->post('conflicts/resolve-all', 'CmsSyncDashboardController@resolveAllConflicts');
                                $router->post('conflicts/{id}/resolve', 'CmsSyncDashboardController@resolveConflict');
                                $router->get('config', 'CmsSyncDashboardController@config');
                                $router->put('config', 'CmsSyncDashboardController@updateConfig');
                            });
                            $router->post('webhook', 'WebhookController@cmsEventWebhook');
                        });

                        $router->prefix('finance')->group(function ($router) {
                            $router->get('dashboard', 'FinancialController@dashboard');

                            $router->get('settlements', 'FinancialController@listSettlements');
                            $router->post('settlements', 'FinancialController@createSettlement');
                            $router->get('settlements/{id}', 'FinancialController@getSettlement');
                            $router->post('settlements/{id}/approve', 'FinancialController@approveSettlement');
                            $router->post('settlements/{id}/process', 'FinancialController@processSettlement');

                            $router->get('cod/summary', 'FinancialController@codSummary');
                            $router->get('cod', 'FinancialController@listCODCollections');
                            $router->post('cod', 'FinancialController@recordCODCollection');
                            $router->post('cod/reconcile', 'FinancialController@reconcileCOD');

                            $router->get('penalties/summary', 'FinancialController@penaltySummary');
                            $router->get('penalties', 'FinancialController@listPenalties');
                            $router->post('penalties', 'FinancialController@createPenalty');
                            $router->post('penalties/{id}/apply', 'FinancialController@applyPenalty');
                            $router->post('penalties/{id}/waive', 'FinancialController@waivePenalty');

                            $router->get('payouts/summary', 'FinancialController@payoutSummary');
                            $router->get('payouts', 'FinancialController@listPayouts');
                            $router->post('payouts/generate', 'FinancialController@generatePayout');
                            $router->post('payouts/{id}/approve', 'FinancialController@approvePayout');
                            $router->post('payouts/{id}/process', 'FinancialController@processPayout');

                            $router->post('reconciliation', 'FinancialController@runReconciliation');
                            $router->get('reconciliation/report', 'FinancialController@reconciliationReport');
                            $router->get('reconciliation/discrepancies', 'FinancialController@listDiscrepancies');
                            $router->post('reconciliation/discrepancies/{id}/resolve', 'FinancialController@resolveDiscrepancy');
                        });

                        $router->prefix('integrations')->group(function ($router) {
                            $router->get('status', 'IntegrationController@status');
                            $router->get('logs', 'IntegrationController@integrationLogs');

                            $router->prefix('temporal')->group(function ($router) {
                                $router->get('connection', 'IntegrationController@temporalConnection');
                                $router->get('workflows', 'IntegrationController@temporalWorkflows');
                                $router->post('workflows/start', 'IntegrationController@temporalStartWorkflow');
                                $router->get('workflows/{workflowId}', 'IntegrationController@temporalQueryWorkflow');
                                $router->post('workflows/{workflowId}/signal', 'IntegrationController@temporalSignalWorkflow');
                                $router->post('workflows/{workflowId}/terminate', 'IntegrationController@temporalTerminateWorkflow');
                                $router->post('sync/trigger', 'IntegrationController@temporalSyncTrigger');
                                $router->get('sync/status', 'IntegrationController@temporalSyncStatus');
                                $router->get('registry', 'IntegrationController@temporalWorkflowRegistry');
                                $router->get('registry/stats', 'IntegrationController@temporalWorkflowRegistryStats');
                            });

                            $router->prefix('cms')->group(function ($router) {
                                $router->get('health', 'IntegrationController@cmsHealth');
                                $router->get('nodes', 'IntegrationController@cmsNodes');
                                $router->get('tenants', 'IntegrationController@cmsTenants');
                                $router->get('pois', 'IntegrationController@cmsPOIs');
                                $router->get('collections', 'IntegrationController@cmsCollections');
                                $router->get('governance', 'IntegrationController@cmsGovernance');
                                $router->get('storage', 'IntegrationController@cmsStorage');
                                $router->get('storage/info', 'IntegrationController@cmsStorageInfo');
                                $router->post('sync', 'IntegrationController@cmsSync');
                            });

                            $router->prefix('erpnext')->group(function ($router) {
                                $router->get('status', 'IntegrationController@erpnextStatus');
                                $router->post('settlement', 'IntegrationController@erpnextSettlement');
                            });

                            $router->prefix('outbox')->group(function ($router) {
                                $router->get('stats', 'IntegrationController@outboxStats');
                                $router->post('dispatch', 'IntegrationController@outboxDispatch');
                                $router->post('publish', 'IntegrationController@outboxPublish');
                                $router->get('recent', 'IntegrationController@outboxRecent');
                            });
                        });
                    }
                );
            }
        );

        $router->prefix('v1')->group(
            function ($router) {
                $router->get('hierarchy/tree', 'HierarchyController@tree');
                $router->get('hierarchy/resolve', 'HierarchyController@resolve');
            }
        );
    }
);

Route::prefix('api/platform')->namespace('Fleetbase\CityOS\Http\Controllers')->middleware(['fleetbase.protected'])->group(
    function ($router) {
        $router->get('context', 'PlatformContextController@context');
        $router->get('tenants/default', 'PlatformContextController@defaultTenant');
        $router->get('capabilities', 'PlatformContextController@capabilities');
    }
);

Route::prefix('api')->namespace('Fleetbase\CityOS\Http\Controllers')->middleware(['fleetbase.protected'])->group(
    function ($router) {
        $router->get('workflow-registry', 'WorkflowRegistryController@index');
        $router->post('workflow-registry', 'WorkflowRegistryController@store');
        $router->get('workflow-definitions', 'WorkflowRegistryController@definitions');
        $router->get('queue-system-map', 'WorkflowRegistryController@queueSystemMap');
        $router->post('workflow-registry/sync', 'WorkflowRegistryController@sync');
    }
);

Route::prefix('api/webhooks/cityos')->namespace('Fleetbase\CityOS\Http\Controllers')->group(
    function ($router) {
        $router->post('cms', 'WebhookController@cmsWebhook');
    }
);
