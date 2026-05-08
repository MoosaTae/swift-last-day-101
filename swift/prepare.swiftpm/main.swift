class SBox { var v = 0 }
  var arr = [SBox(), SBox()]
  arr[0].v = 9

  let  a = arr              // both copy the array (pointer slots)
  var  b = arr
  arr[0].v = 100
