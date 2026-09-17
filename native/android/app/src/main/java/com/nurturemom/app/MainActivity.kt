package com.nurturemom.app

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.aggregate.AggregateMetric
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneId

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private var healthClient: HealthConnectClient? = null
    private val readStepsPermission = HealthPermission.getReadPermission(StepsRecord::class)
    private lateinit var permissionLauncher: ActivityResultLauncher<Set<String>>

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        permissionLauncher = registerForActivityResult(
            PermissionController.createRequestPermissionResultContract()
        ) {
            syncToday()
        }

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            webChromeClient = WebChromeClient()
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    syncToday()
                }
            }
            addJavascriptInterface(HealthBridge(), "AndroidHealth")
        }
        setContentView(webView)
        webView.loadUrl("file:///android_asset/www/index.html")
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized) syncToday()
    }

    inner class HealthBridge {
        @JavascriptInterface
        fun requestHealthAccess() {
            runOnUiThread {
                when (HealthConnectClient.getSdkStatus(this@MainActivity)) {
                    HealthConnectClient.SDK_AVAILABLE -> {
                        ensureClient()
                        lifecycleScope.launch {
                            val granted = healthClient?.permissionController?.getGrantedPermissions().orEmpty()
                            if (granted.contains(readStepsPermission)) syncToday()
                            else permissionLauncher.launch(setOf(readStepsPermission))
                        }
                    }
                    HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> {
                        dispatch(false, false, null, "Health Connect needs to be installed or updated on this phone.")
                    }
                    else -> dispatch(false, false, null, "Health Connect is not available on this phone.")
                }
            }
        }

        @JavascriptInterface
        fun syncToday() {
            this@MainActivity.syncToday()
        }
    }

    private fun ensureClient() {
        if (healthClient == null && HealthConnectClient.getSdkStatus(this) == HealthConnectClient.SDK_AVAILABLE) {
            healthClient = HealthConnectClient.getOrCreate(this)
        }
    }

    private fun syncToday() {
        if (!::webView.isInitialized) return
        when (HealthConnectClient.getSdkStatus(this)) {
            HealthConnectClient.SDK_AVAILABLE -> {
                ensureClient()
                lifecycleScope.launch {
                    try {
                        val client = healthClient ?: return@launch
                        val granted = client.permissionController.getGrantedPermissions()
                        if (!granted.contains(readStepsPermission)) {
                            dispatch(true, false, null, "Connect Health Connect once to let NurtureMom notice your steps automatically.")
                            return@launch
                        }

                        val zone = ZoneId.systemDefault()
                        val start = LocalDate.now(zone).atStartOfDay(zone).toInstant()
                        val end = java.time.Instant.now()
                        val result = client.aggregate(
                            AggregateRequest(
                                metrics = setOf(StepsRecord.COUNT_TOTAL),
                                timeRangeFilter = TimeRangeFilter.between(start, end)
                            )
                        )
                        val steps = result[StepsRecord.COUNT_TOTAL] ?: 0L
                        dispatch(true, true, steps, null)
                    } catch (t: Throwable) {
                        dispatch(true, true, null, "Your movement data could not be refreshed just yet.")
                    }
                }
            }
            HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> dispatch(false, false, null, "Health Connect needs to be installed or updated on this phone.")
            else -> dispatch(false, false, null, "Health Connect is not available on this phone.")
        }
    }

    private fun dispatch(available: Boolean, permission: Boolean, steps: Long?, message: String?) {
        val payload = JSONObject().apply {
            put("platform", "android")
            put("available", available)
            put("permission", permission)
            put("source", "health_connect")
            put("date", LocalDate.now().toString())
            put("lastSyncAt", java.time.Instant.now().toString())
            if (steps != null) put("steps", steps)
            if (message != null) put("message", message)
        }
        val js = "window.dispatchEvent(new CustomEvent('nurturemom:native-health',{detail:${payload}}));"
        webView.post { webView.evaluateJavascript(js, null) }
    }

    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
