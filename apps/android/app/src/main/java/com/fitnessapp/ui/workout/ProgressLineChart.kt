package com.fitcoach.app.ui.workout

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

@Composable
fun ProgressLineChart(
    points: List<VolumePoint>,
    modifier: Modifier = Modifier,
    lineColor: Color = Color(0xFFA3FF12),
    gridColor: Color = Color(0x33F0F0F0),
) {
    if (points.isEmpty()) return

    Canvas(modifier = modifier) {
        val w = size.width
        val h = size.height
        val padH = 24.dp.toPx()
        val padV = 16.dp.toPx()
        val plotW = w - padH * 2
        val plotH = h - padV * 2

        val minY = points.minOf { it.maxWeight }
        val maxY = points.maxOf { it.maxWeight }.let { if (it == minY) it + 1.0 else it }
        val yRange = maxY - minY

        // Horizontal grid lines (4)
        val gridLines = 4
        repeat(gridLines + 1) { i ->
            val y = padV + plotH * i / gridLines
            drawLine(gridColor, Offset(padH, y), Offset(w - padH, y), strokeWidth = 1.dp.toPx())
        }

        // Map points to canvas coords
        val coords = points.mapIndexed { i, p ->
            val x = padH + (i.toFloat() / (points.size - 1).coerceAtLeast(1)) * plotW
            val y = padV + plotH * (1f - ((p.maxWeight - minY) / yRange).toFloat())
            Offset(x, y)
        }

        // Draw line path
        if (coords.size >= 2) {
            val path = Path().apply {
                moveTo(coords.first().x, coords.first().y)
                coords.drop(1).forEach { lineTo(it.x, it.y) }
            }
            drawPath(
                path,
                color = lineColor,
                style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round),
            )
        }

        // Draw dots
        coords.forEach { coord ->
            drawCircle(lineColor, radius = 4.dp.toPx(), center = coord)
            drawCircle(Color(0xFF0B0C10), radius = 2.dp.toPx(), center = coord)
        }
    }
}
