$excel = New-Object -ComObject Excel.Application
$workbook = $excel.Workbooks.Open("C:\Users\Usuario\Documents\SaveOrEliminate\ListasDeezer.xlsx")
$worksheet = $workbook.Sheets(1)
for ($i = 2; $i -le $worksheet.UsedRange.Rows.Count; $i++) {
    $year = $worksheet.Cells($i, 1).Value()
    $id = $worksheet.Cells($i, 2).Value()
    if ($year -and $id) {
        Write-Output "$year,$id"
    }
}
$workbook.Close()
$excel.Quit()
