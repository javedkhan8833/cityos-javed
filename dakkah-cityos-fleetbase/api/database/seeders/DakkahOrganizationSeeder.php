<?php

namespace Database\Seeders;

use Fleetbase\Models\Company;
use Fleetbase\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DakkahOrganizationSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding Dakkah master organization...');

        $orgName  = env('DAKKAH_ORG_NAME', 'Dakkah Systems');
        $email    = env('DAKKAH_ADMIN_EMAIL', 'admin@dakkah.io');
        $name     = env('DAKKAH_ADMIN_NAME', 'Dakkah Admin');
        $phone    = env('DAKKAH_ADMIN_PHONE', '+966500000000');
        $password = env('DAKKAH_ADMIN_PASSWORD', 'Dakkah@2026!');

        $company = Company::firstOrCreate(
            ['name' => $orgName],
            [
                'status'                  => 'active',
                'onboarding_completed_at' => now(),
            ]
        );
        $this->command->info("  Company: {$company->name} ({$company->uuid})");

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name'         => $name,
                'phone'        => $phone,
                'password'     => $password,
                'company_uuid' => $company->uuid,
                'status'       => 'active',
            ]
        );

        $user->setUserType('admin');
        $company->setOwner($user, true);
        $company->save();
        $user->assignCompany($company, 'Administrator');
        $user->assignSingleRole('Administrator');

        $this->command->info("  Admin: {$user->name} <{$user->email}>");
        $this->command->info("  Company UUID: {$company->uuid}");
    }
}
