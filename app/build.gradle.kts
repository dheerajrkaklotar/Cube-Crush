plugins {
    alias(libs.plugins.android.application)
}

android {
    namespace = "com.cubecrush.blockblast"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.cubecrush.blockblast"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    signingConfigs {
        getByName("debug") {
            val rootKeystore = rootProject.file("debug.keystore")
            if (rootKeystore.exists()) {
                storeFile = rootKeystore
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
    }

    buildTypes {
        getByName("debug") {
            isDebuggable = true
            signingConfig = signingConfigs.getByName("debug")
        }
        getByName("release") {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation(libs.androidx.webkit)
    implementation(libs.play.services.ads)
}
