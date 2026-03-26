<?php

$patches = [
    '/fleetbase/api/vendor/fleetbase/laravel-mysql-spatial/src/Eloquent/SpatialExpression.php' => [
        "ST_GeomFromText(?, ?, 'axis-order=long-lat')" => 'ST_GeomFromText(?, ?)',
    ],
    '/fleetbase/api/vendor/fleetbase/laravel-mysql-spatial/src/Eloquent/SpatialTrait.php' => [
        "ST_GeomFromText(?, ?, 'axis-order=long-lat')" => 'ST_GeomFromText(?, ?)',
    ],
    '/fleetbase/api/vendor/fleetbase/fleetops-api/server/src/Support/Utils.php' => [
        "return DB::raw(\"(ST_PointFromText('\$wkt', 0, 'axis-order=long-lat'))\");" => "return DB::raw(\"(ST_PointFromText('\$wkt', 0))\");",
    ],
    '/fleetbase/api/vendor/fleetbase/fleetops-api/server/src/Http/Resources/v1/Order.php' => [
        "\$isInternal = Http::isInternalRequest();" => "\$isInternal = Http::isInternalRequest();\n        \$isCompact = \$request->boolean('compact');",
        "            'customer'             => \$this->whenLoaded('customer', function () {\n                return \$this->setCustomerType(\$this->transformMorphResource(\$this->customer));\n            }),\n            'payload'              => new Payload(\$this->payload),\n            'facilitator'          => \$this->whenLoaded('facilitator', function () {\n                return \$this->setFacilitatorType(\$this->transformMorphResource(\$this->facilitator));\n            }),\n            'driver_assigned'      => \$this->whenLoaded('driverAssigned', function () {\n                return new Driver(\$this->driverAssigned);\n            }),\n            'vehicle_assigned'     => \$this->whenLoaded('vehicleAssigned', function () {\n                return new Vehicle(\$this->vehicleAssigned);\n            }),\n            'tracking_number'      => new TrackingNumber(\$this->trackingNumber),\n            'tracking_statuses'    => \$this->whenLoaded('trackingStatuses', function () {\n                return TrackingStatus::collection(\$this->trackingStatuses);\n            })," => "            'customer'             => \$this->when(!\$isCompact && \$this->relationLoaded('customer'), function () {\n                return \$this->setCustomerType(\$this->transformMorphResource(\$this->customer));\n            }),\n            'payload'              => \$this->when(!\$isCompact, function () {\n                return new Payload(\$this->payload);\n            }),\n            'facilitator'          => \$this->when(!\$isCompact && \$this->relationLoaded('facilitator'), function () {\n                return \$this->setFacilitatorType(\$this->transformMorphResource(\$this->facilitator));\n            }),\n            'driver_assigned'      => \$this->when(!\$isCompact && \$this->relationLoaded('driverAssigned'), function () {\n                return new Driver(\$this->driverAssigned);\n            }),\n            'vehicle_assigned'     => \$this->when(!\$isCompact && \$this->relationLoaded('vehicleAssigned'), function () {\n                return new Vehicle(\$this->vehicleAssigned);\n            }),\n            'tracking_number'      => new TrackingNumber(\$this->trackingNumber),\n            'tracking_statuses'    => \$this->when(!\$isCompact && \$this->relationLoaded('trackingStatuses'), function () {\n                return TrackingStatus::collection(\$this->trackingStatuses);\n            }),",
        "            'comments'             => \$this->when(\$isInternal, Comment::collection(\$this->comments)),\n            'files'                => \$this->when(\$isInternal, \$this->files, File::collection(\$this->files)),\n            'purchase_rate'        => new PurchaseRate(\$this->purchaseRate)," => "            'comments'             => \$this->when(\$isInternal && !\$isCompact, Comment::collection(\$this->comments)),\n            'files'                => \$this->when(\$isInternal && !\$isCompact, \$this->files, File::collection(\$this->files)),\n            'purchase_rate'        => \$this->when(!\$isCompact, function () {\n                return new PurchaseRate(\$this->purchaseRate);\n            }),",
    ],
    '/fleetbase/api/vendor/fleetbase/fleetops-api/server/src/Http/Resources/v1/TrackingNumber.php' => [
        "    public function toArray(\$request)\n    {\n        return [" => "    public function toArray(\$request)\n    {\n        \$isCompact = \$request->boolean('compact');\n\n        return [",
        "            'qr_code'         => \$this->qr_code,\n            'barcode'         => \$this->barcode," => "            'qr_code'         => \$this->when(!\$isCompact, \$this->qr_code),\n            'barcode'         => \$this->when(!\$isCompact, \$this->barcode),",
    ],
    '/fleetbase/api/vendor/fleetbase/fleetops-api/server/src/Http/Resources/v1/Place.php' => [
        "    public function toArray(\$request)\n    {\n        \$this->loadMissing('owner');\n\n        return \$this->withCustomFields([" => "    public function toArray(\$request)\n    {\n        \$isCompact = \$request->boolean('compact');\n\n        if (!\$isCompact) {\n            \$this->loadMissing('owner');\n        }\n\n        return \$this->withCustomFields([",
        "            'owner'                 => \$this->whenLoaded('owner', fn () => Resolve::resourceForMorph(\$this->owner_type, \$this->owner_uuid)?->without(['place', 'places'])),\n            'tracking_number'       => \$this->whenLoaded('trackingNumber', fn () => \$this->trackingNumber)," => "            'owner'                 => \$this->when(!\$isCompact && \$this->relationLoaded('owner'), fn () => Resolve::resourceForMorph(\$this->owner_type, \$this->owner_uuid)?->without(['place', 'places'])),\n            'tracking_number'       => \$this->when(!\$isCompact && \$this->relationLoaded('trackingNumber'), fn () => \$this->trackingNumber),",
    ],
];

$patchedFiles = [];

foreach ($patches as $file => $replacements) {
    $code = file_get_contents($file);
    if ($code === false) {
        fwrite(STDERR, "Unable to read {$file}" . PHP_EOL);
        exit(1);
    }

    $original = $code;
    foreach ($replacements as $search => $replace) {
        $code = str_replace($search, $replace, $code);
    }

    if ($code === $original) {
        fwrite(STDERR, "No Fleetbase patch changes applied for {$file}" . PHP_EOL);
        exit(1);
    }

    if (file_put_contents($file, $code) === false) {
        fwrite(STDERR, "Unable to write {$file}" . PHP_EOL);
        exit(1);
    }

    $patchedFiles[] = $file;
}

echo 'Patched Fleetbase runtime for PostgreSQL and compact API responses:' . PHP_EOL;
foreach ($patchedFiles as $file) {
    echo " - {$file}" . PHP_EOL;
}
