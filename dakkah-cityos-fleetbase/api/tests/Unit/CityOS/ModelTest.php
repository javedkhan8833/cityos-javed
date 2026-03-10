<?php

namespace Tests\Unit\CityOS;

use Tests\TestCase;
use Fleetbase\CityOS\Models\Country;
use Fleetbase\CityOS\Models\City;
use Fleetbase\CityOS\Models\Sector;
use Fleetbase\CityOS\Models\Category;
use Fleetbase\CityOS\Models\Tenant;
use Fleetbase\CityOS\Models\Channel;
use Fleetbase\CityOS\Models\Surface;
use Fleetbase\CityOS\Models\Portal;
use Fleetbase\CityOS\Models\OutboxEvent;
use Fleetbase\CityOS\Models\IntegrationLog;

class ModelTest extends TestCase
{
    public function test_country_model_has_correct_table()
    {
        $model = new Country();
        $this->assertEquals('cityos_countries', $model->getTable());
    }

    public function test_city_model_has_correct_table()
    {
        $model = new City();
        $this->assertEquals('cityos_cities', $model->getTable());
    }

    public function test_sector_model_has_correct_table()
    {
        $model = new Sector();
        $this->assertEquals('cityos_sectors', $model->getTable());
    }

    public function test_category_model_has_correct_table()
    {
        $model = new Category();
        $this->assertEquals('cityos_categories', $model->getTable());
    }

    public function test_tenant_model_has_correct_table()
    {
        $model = new Tenant();
        $this->assertEquals('cityos_tenants', $model->getTable());
    }

    public function test_channel_model_has_correct_table()
    {
        $model = new Channel();
        $this->assertEquals('cityos_channels', $model->getTable());
    }

    public function test_surface_model_has_correct_table()
    {
        $model = new Surface();
        $this->assertEquals('cityos_surfaces', $model->getTable());
    }

    public function test_portal_model_has_correct_table()
    {
        $model = new Portal();
        $this->assertEquals('cityos_portals', $model->getTable());
    }

    public function test_outbox_event_model_has_correct_table()
    {
        $model = new OutboxEvent();
        $this->assertEquals('cityos_outbox', $model->getTable());
    }

    public function test_integration_log_model_has_correct_table()
    {
        $model = new IntegrationLog();
        $this->assertEquals('cityos_integration_logs', $model->getTable());
    }

    public function test_country_model_fillable_contains_expected_fields()
    {
        $model = new Country();
        $fillable = $model->getFillable();

        $this->assertContains('code', $fillable);
        $this->assertContains('name', $fillable);
        $this->assertContains('name_ar', $fillable);
        $this->assertContains('status', $fillable);
        $this->assertContains('currency_code', $fillable);
    }

    public function test_city_model_fillable_contains_expected_fields()
    {
        $model = new City();
        $fillable = $model->getFillable();

        $this->assertContains('slug', $fillable);
        $this->assertContains('name', $fillable);
        $this->assertContains('name_ar', $fillable);
        $this->assertContains('country_uuid', $fillable);
        $this->assertContains('status', $fillable);
    }

    public function test_sector_model_fillable_contains_expected_fields()
    {
        $model = new Sector();
        $fillable = $model->getFillable();

        $this->assertContains('slug', $fillable);
        $this->assertContains('name', $fillable);
        $this->assertContains('city_uuid', $fillable);
        $this->assertContains('status', $fillable);
    }

    public function test_category_model_fillable_contains_expected_fields()
    {
        $model = new Category();
        $fillable = $model->getFillable();

        $this->assertContains('slug', $fillable);
        $this->assertContains('name', $fillable);
        $this->assertContains('sector_uuid', $fillable);
        $this->assertContains('parent_uuid', $fillable);
        $this->assertContains('level', $fillable);
    }

    public function test_outbox_event_model_fillable_contains_expected_fields()
    {
        $model = new OutboxEvent();
        $fillable = $model->getFillable();

        $this->assertContains('event_id', $fillable);
        $this->assertContains('event_type', $fillable);
        $this->assertContains('payload', $fillable);
        $this->assertContains('status', $fillable);
        $this->assertContains('correlation_id', $fillable);
    }

    public function test_country_model_has_cities_relationship()
    {
        $country = Country::first();
        $this->assertNotNull($country);
        $this->assertTrue(method_exists($country, 'cities'));
    }

    public function test_countries_exist_in_database()
    {
        $count = Country::where('status', 'active')->get()->count();
        $this->assertGreaterThanOrEqual(2, $count);
    }

    public function test_cities_exist_in_database()
    {
        $count = City::where('status', 'active')->get()->count();
        $this->assertGreaterThanOrEqual(2, $count);
    }

    public function test_country_sa_exists()
    {
        $country = Country::where('code', 'SA')->first();
        $this->assertNotNull($country);
        $this->assertEquals('Saudi Arabia', $country->name);
    }

    public function test_country_ae_exists()
    {
        $country = Country::where('code', 'AE')->first();
        $this->assertNotNull($country);
        $this->assertEquals('United Arab Emirates', $country->name);
    }

    public function test_outbox_event_creates_record()
    {
        $event = OutboxEvent::create([
            'event_id' => 'test-evt-' . uniqid(),
            'event_type' => 'MODEL_TEST_EVENT',
            'payload' => ['test' => true],
            'status' => 'pending',
            'correlation_id' => 'corr-' . uniqid(),
        ]);

        $this->assertNotNull($event->id);
        $this->assertEquals('MODEL_TEST_EVENT', $event->event_type);
        $this->assertEquals('pending', $event->status);
        $this->assertTrue($event->isPending());
        $this->assertFalse($event->isPublished());

        $event->delete();
    }

    public function test_outbox_event_mark_published()
    {
        $event = OutboxEvent::create([
            'event_id' => 'test-pub-' . uniqid(),
            'event_type' => 'PUBLISH_TEST',
            'payload' => ['test' => true],
            'status' => 'pending',
            'correlation_id' => 'corr-' . uniqid(),
        ]);

        $event->markPublished();
        $event->refresh();

        $this->assertEquals('published', $event->status);
        $this->assertTrue($event->isPublished());
        $this->assertNotNull($event->published_at);

        $event->delete();
    }

    public function test_outbox_event_mark_failed()
    {
        $event = OutboxEvent::create([
            'event_id' => 'test-fail-' . uniqid(),
            'event_type' => 'FAIL_TEST',
            'payload' => ['test' => true],
            'status' => 'pending',
            'correlation_id' => 'corr-' . uniqid(),
            'retry_count' => 0,
            'max_retries' => 3,
        ]);

        $event->markFailed('Test error message');
        $event->refresh();

        $this->assertEquals('failed', $event->status);
        $this->assertEquals(1, $event->retry_count);
        $this->assertEquals('Test error message', $event->error_message);
        $this->assertTrue($event->isFailed());

        $event->delete();
    }

    public function test_integration_log_creates_via_log_request()
    {
        $log = IntegrationLog::logRequest('test', 'unit_test', [
            'request_data' => ['action' => 'test'],
            'status' => 'success',
        ]);

        $this->assertNotNull($log->id);
        $this->assertEquals('test', $log->integration);
        $this->assertEquals('unit_test', $log->operation);

        $log->delete();
    }
}
