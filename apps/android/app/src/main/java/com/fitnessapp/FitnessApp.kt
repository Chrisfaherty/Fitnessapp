package com.fitcoach.app

import android.app.Application
import androidx.work.WorkManager
import com.fitcoach.app.data.health.HealthSyncWorker
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class FitCoachApp : Application() {

    override fun onCreate() {
        super.onCreate()
        HealthSyncWorker.schedule(WorkManager.getInstance(this))
    }
}
