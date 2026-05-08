struct SBox { var v = 0 }

var arr = [SBox(), SBox()]
arr[0].v = 9
let snapshot = arr
var snapshot_var = arr
arr[0].v = 100

print(arr[0].v, snapshot[0].v, snapshot_var[0].v)

