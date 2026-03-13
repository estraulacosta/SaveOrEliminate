try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $workbook = $excel.Workbooks.Open('C:\Users\Usuario\Documents\SaveOrEliminate\ListasDeezer.xlsx')
    $worksheet = $workbook.Sheets(1)
    Write-Host "Sheet name: $($worksheet.Name)"
    Write-Host "Max rows: $($worksheet.UsedRange.Rows.Count)"
    Write-Host "Max cols: $($worksheet.UsedRange.Columns.Count)"
    
    Write-Host "--- Data ---"
    for ($i = 1; $i -le $worksheet.UsedRange.Rows.Count; $i++) {
        $col1 = $worksheet.Cells($i, 1).Value()
        $col2 = $worksheet.Cells($i, 2).Value()
        if ($col1) {
            Write-Host ("Row {0}: {1} | {2}" -f $i, $col1, $col2)
        }
    }
    
    $workbook.Close()
    $excel.Quit()
} catch {
    Write-Host "Error: $_"
}
