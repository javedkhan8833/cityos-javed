<?php

try {
    $dsn = "pgsql:host=ep-lively-band-aiwoo54w-pooler.c-4.us-east-1.aws.neon.tech;port=5432;dbname=neondb;sslmode=require";
    $user = "neondb_owner";
    $password = "npg_0SJWHs1UGtTp";
    
    $pdo = new PDO($dsn, $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $key = 'flb_live_2hYe5d9YsAMZFbJykakI';
    
    $stmt = $pdo->prepare("SELECT uuid, company_uuid FROM api_credentials WHERE key = :key");
    $stmt->execute(['key' => $key]);
    $cred = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($cred) {
        echo "Credential: " . $cred['uuid'] . "\n";
        echo "Company UUID: " . $cred['company_uuid'] . "\n";
        
        $stmt = $pdo->prepare("SELECT owner_uuid FROM companies WHERE uuid = :uuid");
        $stmt->execute(['uuid' => $cred['company_uuid']]);
        $company = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($company) {
            echo "Company Owner UUID: " . ($company['owner_uuid'] ?? 'NULL') . "\n";
            if (!empty($company['owner_uuid'])) {
                $stmt = $pdo->prepare("SELECT name, email FROM users WHERE uuid = :uuid");
                $stmt->execute(['uuid' => $company['owner_uuid']]);
                $userRec = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($userRec) {
                    echo "Owner details: Name=" . $userRec['name'] . ", Email=" . $userRec['email'] . "\n";
                } else {
                    echo "Owner user record not found!\n";
                }
            } else {
                echo "Owner UUID is null!\n";
            }
        } else {
            echo "Company not found!\n";
        }
    } else {
        echo "Credential not found!\n";
    }

} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
