<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('sensors', function (Blueprint $table) {
            $table->increments('id');
            $table->string('uuid', 191)->unique();
            $table->string('_key')->nullable()->index();
            $table->string('company_uuid', 191)->constrained('companies', 'uuid')->cascadeOnDelete();

            $table->string('name')->nullable()->index();
            $table->string('slug')->nullable()->index();
            $table->string('sensor_type')->index();             // temp, humidity, door, fuel, pressure, vibration, cargo-weight, etc.
            $table->string('unit')->nullable();                 // C, F, %, psi, kg, etc.
            $table->float('min_threshold')->nullable();
            $table->float('max_threshold')->nullable();
            $table->boolean('threshold_inclusive')->default(true);
            $table->string('type')->nullable()->index();

            $table->timestamp('last_reading_at')->nullable()->index();
            $table->string('last_value')->nullable();           // use string to store raw value
            $table->json('calibration')->nullable();            // { offset, slope, notes }
            $table->unsignedInteger('report_frequency_sec')->nullable();

            // A sensor can belong to a device, asset, or any other entity
            $table->string('sensorable_type')->nullable();
            $table->string('sensorable_uuid', 191)->nullable();
            $table->index(['sensorable_type', 'sensorable_uuid']);

            // Optionally coupled to a device (if it streams via a device)
            $table->string('device_uuid', 191)->nullable()->constrained('devices', 'uuid')->nullOnDelete();
            $table->string('warranty_uuid', 191)->nullable()->constrained('warranties', 'uuid')->nullOnDelete();

            $table->json('meta')->nullable();
            $table->string('created_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();
            $table->string('updated_by_uuid', 191)->nullable()->constrained('users', 'uuid')->nullOnDelete();

            $table->softDeletes();
            $table->timestamps();

            $table->index(['company_uuid', 'sensor_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();
        Schema::dropIfExists('sensors');
        Schema::enableForeignKeyConstraints();
    }
};
