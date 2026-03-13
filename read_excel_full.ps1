try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $workbook = $excel.Workbooks.Open('C:\Users\Usuario\Documents\SaveOrEliminate\ListasDeezer.xlsx')
    $worksheet = $workbook.Sheets(1)
    
    Write-Host "Attempting to read all data..."
    $allData = @()
    
    for ($i = 1; $i -le 70; $i++) {
        $col1 = $worksheet.Cells($i, 1).Value()
        $col2 = $worksheet.Cells($i, 2).Value()
        if ($col1 -ne $null) {
            $allData += @{Year = $col1; PlaylistId = $col2}
            Write-Host ("Row {0}: Year={1}, PlaylistId={2}" -f $i, $col1, $col2)
        }
    }
    
    Write-Host "Total records: $($allData.Count)"
    
    $workbook.Close()
    $excel.Quit()
} catch {
    Write-Host "Error: $_"
}
