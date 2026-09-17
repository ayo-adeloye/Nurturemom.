package com.nurturemom.app

import android.app.Activity
import android.os.Bundle
import android.text.SpannableStringBuilder
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

class PrivacyRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val pad = (24 * resources.displayMetrics.density).toInt()
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            gravity = Gravity.TOP
        }

        layout.addView(TextView(this).apply {
            text = "NurtureMom & your movement data"
            textSize = 26f
        })
        layout.addView(TextView(this).apply {
            textSize = 16f
            setPadding(0, pad / 2, 0, 0)
            text = SpannableStringBuilder()
                .append("NurtureMom can read your daily step count from Health Connect only after you choose to allow it.\n\n")
                .append("We use this information to show your gentle movement progress and private Plus reflections. NurtureMom does not use step data to diagnose, score, or judge your recovery.\n\n")
                .append("You can revoke Health Connect access at any time in your phone settings.")
        })
        setContentView(layout)
    }
}
