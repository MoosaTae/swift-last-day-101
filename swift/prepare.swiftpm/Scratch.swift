// Scratch notes preserved from earlier exploration.
// Wrapped in a function so it stops being top-level code (which would
// conflict with @main MyApp). Not called anywhere — purely a reference.

import Foundation

func _refTypeScratch() {
    class SBox { var v = 0 }
    var arr = [SBox(), SBox()]
    arr[0].v = 9

    let  a = arr              // both copy the array (pointer slots)
    var  b = arr
    arr[0].v = 100

    _ = (a, b)                // silence unused warnings
}
