// ==================== CẤU HÌNH ====================
const TONG_RAM = 1024;  // Tổng dung lượng RAM (MB)

// Mảng màu sắc cho các tiến trình
const MANG_MAU = [
    '#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f472b6',
    '#a78bfa', '#4ade80', '#fb923c', '#22d3ee', '#e879f9',
    '#86efac', '#fca5a5', '#67e8f9', '#c4b5fd', '#6ee7b7'
];

// ==================== BIẾN TOÀN CỤC ====================
let boNho = [{ batDau: 0, kichThuoc: TONG_RAM, tenTienTrinh: null }];  // Mảng các khối nhớ
let danhSachTienTrinh = [];  // Danh sách tiến trình đang chạy
let bangMau = {};            // Lưu màu của từng tiến trình
let chiSoMau = 0;            // Chỉ số màu hiện tại
let thuatToanHienTai = 'first';  // Thuật toán đang dùng: first, best, worst
let thoiGianLog = 0;         // Thời gian cho nhật ký

// Thống kê cho từng thuật toán
const thongKe = {
    first: { soLanCapPhat: 0, soLanThatBai: 0, tongPhanManh: 0, soLanChup: 0 },
    best:  { soLanCapPhat: 0, soLanThatBai: 0, tongPhanManh: 0, soLanChup: 0 },
    worst: { soLanCapPhat: 0, soLanThatBai: 0, tongPhanManh: 0, soLanChup: 0 },
};

// Mô tả các thuật toán
const moTaThuatToan = {
    first: 'Chọn lỗ trống <strong>đầu tiên</strong> đủ lớn. Nhanh nhưng tạo nhiều phân mảnh đầu bộ nhớ.',
    best:  'Chọn lỗ trống <strong>nhỏ nhất</strong> vừa đủ. Giảm thiểu phần dư, phân mảnh thấp nhất.',
    worst: 'Chọn lỗ trống <strong>lớn nhất</strong>. Phần dư lớn, dễ tạo phân mảnh lớn hơn.',
};

// ==================== HÀM CHỌN THUẬT TOÁN ====================
/**
 * Chọn thuật toán cấp phát
 * @param {HTMLElement} phanTu - Phần tử được click
 * @param {string} thuatToan - Tên thuật toán: 'first', 'best', 'worst'
 */
function chonThuatToan(phanTu, thuatToan) {
    thuatToanHienTai = thuatToan;
    
    // Bỏ class active ở tất cả và thêm cho phần tử được chọn
    document.querySelectorAll('.nut-thuat-toan').forEach(p => p.classList.remove('dang-chon'));
    phanTu.classList.add('dang-chon');
    
    // Cập nhật mô tả và hiển thị
    document.getElementById('mo-ta-thuat-toan').innerHTML = moTaThuatToan[thuatToan];
    document.getElementById('thong-tin-thuat-toan').textContent = phanTu.textContent;
    
    ghiLog(`Đã chọn thuật toán: ${phanTu.textContent}`, 'thong-tin');
}

// ==================== HÀM LẤY LỖ TRỐNG ====================
/**
 * Lấy danh sách các lỗ trống trong bộ nhớ
 * @returns {Array} Mảng các khối nhớ trống
 */
function layLoTrong() {
    return boNho.filter(khoi => khoi.tenTienTrinh === null);
}

/**
 * Tìm lỗ trống phù hợp với kích thước yêu cầu
 * @param {number} kichThuoc - Kích thước cần cấp phát
 * @returns {Object|null} Khối nhớ phù hợp hoặc null nếu không tìm thấy
 */
function timLoTrong(kichThuoc) {
    const loTrong = layLoTrong().filter(lo => lo.kichThuoc >= kichThuoc);
    if (!loTrong.length) return null;
    
    if (thuatToanHienTai === 'first') return loTrong[0];  // First-fit: chọn lỗ đầu tiên
    if (thuatToanHienTai === 'best')  return loTrong.reduce((a, b) => a.kichThuoc < b.kichThuoc ? a : b);  // Best-fit: chọn lỗ nhỏ nhất
    if (thuatToanHienTai === 'worst') return loTrong.reduce((a, b) => a.kichThuoc > b.kichThuoc ? a : b);  // Worst-fit: chọn lỗ lớn nhất
}

// ==================== HÀM CẤP PHÁT ====================
/**
 * Cấp phát bộ nhớ cho tiến trình
 * @param {string} tenNhap - Tên tiến trình (tùy chọn)
 * @param {number} kichThuocNhap - Kích thước (tùy chọn)
 */
function capPhat(tenNhap, kichThuocNhap) {
    // Lấy giá trị từ input hoặc tham số
    const ten = tenNhap || document.getElementById('ten-tien-trinh').value.trim() || taoTenTuDong();
    const kichThuoc = parseInt(kichThuocNhap || document.getElementById('kich-thuoc').value);

    // Kiểm tra kích thước hợp lệ
    if (!kichThuoc || kichThuoc < 1 || kichThuoc > TONG_RAM) {
        ghiLog('Kích thước không hợp lệ (1–1024 MB)', 'loi');
        return;
    }
    
    // Kiểm tra tên đã tồn tại
    if (danhSachTienTrinh.find(t => t.ten === ten)) {
        ghiLog(`Tên "${ten}" đã tồn tại`, 'loi');
        return;
    }

    // Tìm lỗ trống phù hợp
    const loTrong = timLoTrong(kichThuoc);
    if (!loTrong) {
        thongKe[thuatToanHienTai].soLanThatBai++;
        ghiLog(`Cấp phát ${ten} (${kichThuoc} MB) THẤT BẠI — không đủ vùng nhớ liên tục`, 'loi');
        capNhatThongKe();
        return;
    }

    // Chọn màu cho tiến trình
    const mau = MANG_MAU[chiSoMau++ % MANG_MAU.length];
    bangMau[ten] = mau;

    // Cập nhật mảng bộ nhớ
    const viTri = boNho.indexOf(loTrong);
    const khoiMoi = [{ batDau: loTrong.batDau, kichThuoc: kichThuoc, tenTienTrinh: ten }];
    if (loTrong.kichThuoc > kichThuoc) {
        khoiMoi.push({ batDau: loTrong.batDau + kichThuoc, kichThuoc: loTrong.kichThuoc - kichThuoc, tenTienTrinh: null });
    }
    boNho.splice(viTri, 1, ...khoiMoi);
    
    // Thêm vào danh sách tiến trình
    danhSachTienTrinh.push({ ten, kichThuoc, mau });

    // Cập nhật thống kê
    thongKe[thuatToanHienTai].soLanCapPhat++;
    chupPhanManh();
    
    ghiLog(`Cấp phát ${ten} (${kichThuoc} MB) thành công tại địa chỉ ${loTrong.batDau} MB — [${thuatToanHienTai.toUpperCase()}]`, 'thanh-cong');

    // Xóa input
    document.getElementById('ten-tien-trinh').value = '';
    document.getElementById('kich-thuoc').value = '';
    
    // Vẽ lại giao diện
    veLai();
}

// ==================== HÀM GIẢI PHÓNG ====================
/**
 * Giải phóng bộ nhớ của tiến trình
 * @param {string} ten - Tên tiến trình cần giải phóng
 */
function giaiPhong(ten) {
    // Đánh dấu các khối nhớ của tiến trình là trống
    boNho.forEach(khoi => { 
        if (khoi.tenTienTrinh === ten) khoi.tenTienTrinh = null; 
    });
    
    // Gộp các khối trống liền kề
    gopCacKhoiTrong();
    
    // Xóa khỏi danh sách tiến trình
    danhSachTienTrinh = danhSachTienTrinh.filter(t => t.ten !== ten);
    delete bangMau[ten];
    
    chupPhanManh();
    ghiLog(`Giải phóng tiến trình ${ten} — phân mảnh ngoại vi tạo ra`, 'can-bao');
    veLai();
}

// ==================== HÀM GỘP CÁC KHỐI TRỐNG ====================
/**
 * Gộp các khối nhớ trống liền kề thành một khối duy nhất
 */
function gopCacKhoiTrong() {
    let daThayDoi = true;
    while (daThayDoi) {
        daThayDoi = false;
        for (let i = 0; i < boNho.length - 1; i++) {
            if (!boNho[i].tenTienTrinh && !boNho[i + 1].tenTienTrinh) {
                boNho.splice(i, 2, { 
                    batDau: boNho[i].batDau, 
                    kichThuoc: boNho[i].kichThuoc + boNho[i + 1].kichThuoc, 
                    tenTienTrinh: null 
                });
                daThayDoi = true;
                break;
            }
        }
    }
}

// ==================== HÀM DỒN DỊCH ====================
/**
 * Thực hiện dồn dịch bộ nhớ (compaction)
 * Gộp tất cả các tiến trình về đầu, các vùng trống về cuối
 */
function donDich() {
    const nutDonDich = document.getElementById('nut-don-dich');
    nutDonDich.disabled = true;
    const thanhRam = document.getElementById('thanh-ram');
    thanhRam.classList.add('dang-animation');

    const phanManhTruoc = tinhPhanManh();
    ghiLog(`Bắt đầu Dồn dịch — phân mảnh hiện tại: ${phanManhTruoc.toFixed(1)}%`, 'thong-tin');

    // Delay để thấy hiệu ứng animation
    setTimeout(() => {
        let viTriHienTai = 0;
        const boNhoMoi = [];
        
        // Di chuyển các tiến trình về đầu
        boNho.filter(khoi => khoi.tenTienTrinh).forEach(khoi => {
            boNhoMoi.push({ 
                batDau: viTriHienTai, 
                kichThuoc: khoi.kichThuoc, 
                tenTienTrinh: khoi.tenTienTrinh 
            });
            viTriHienTai += khoi.kichThuoc;
        });
        
        // Thêm vùng trống còn lại vào cuối
        const conLai = TONG_RAM - viTriHienTai;
        if (conLai > 0) boNhoMoi.push({ batDau: viTriHienTai, kichThuoc: conLai, tenTienTrinh: null });
        
        boNho = boNhoMoi;
        gopCacKhoiTrong();
        
        const phanManhSau = tinhPhanManh();
        ghiLog(`Dồn dịch hoàn tất — phân mảnh giảm từ ${phanManhTruoc.toFixed(1)}% → ${phanManhSau.toFixed(1)}%`, 'thanh-cong');
        
        thanhRam.classList.remove('dang-animation');
        veLai();
        nutDonDich.disabled = false;
    }, 600);
}

// ==================== HÀM TÍNH PHÂN MẢNH ====================
/**
 * Tính tỷ lệ phân mảnh ngoại vi
 * @returns {number} Tỷ lệ phân mảnh (0-100)
 */
function tinhPhanManh() {
    const loTrong = layLoTrong();
    if (loTrong.length <= 1) return 0;
    
    const tongTrong = loTrong.reduce((tong, lo) => tong + lo.kichThuoc, 0);
    const loLonNhat = Math.max(...loTrong.map(lo => lo.kichThuoc));
    
    return tongTrong > 0 ? ((tongTrong - loLonNhat) / TONG_RAM * 100) : 0;
}

/**
 * Chụp tỷ lệ phân mảnh hiện tại để thống kê
 */
function chupPhanManh() {
    const phanManh = tinhPhanManh();
    thongKe[thuatToanHienTai].tongPhanManh += phanManh;
    thongKe[thuatToanHienTai].soLanChup++;
}

// ==================== HÀM TẠO TÊN TỰ ĐỘNG ====================
/**
 * Tạo tên tiến trình tự động (P1, P2, ...)
 * @returns {string} Tên tiến trình
 */
function taoTenTuDong() {
    const tenDaDung = new Set(danhSachTienTrinh.map(t => t.ten));
    for (let i = 1; i <= 99; i++) {
        if (!tenDaDung.has('P' + i)) return 'P' + i;
    }
    return 'P?';
}

// ==================== HÀM THÊM NHANH ====================
/**
 * Thêm tiến trình nhanh từ mẫu
 * @param {string} ten - Tên tiến trình
 * @param {number} kichThuoc - Kích thước
 */
function themNhanh(ten, kichThuoc) {
    document.getElementById('ten-tien-trinh').value = ten;
    document.getElementById('kich-thuoc').value = kichThuoc;
    capPhat();
}

/**
 * Tạo mẫu demo với các tiến trình mẫu
 */
function taoMauThu() {
    datLaiTatCa();
    setTimeout(() => themNhanh('P1', 80), 0);
    setTimeout(() => themNhanh('P2', 120), 80);
    setTimeout(() => themNhanh('P3', 200), 160);
    setTimeout(() => themNhanh('P4', 50), 240);
    setTimeout(() => themNhanh('P5', 150), 320);
    setTimeout(() => { 
        giaiPhong('P2'); 
        giaiPhong('P4'); 
    }, 400);
}

// ==================== HÀM KHỞI TẠO LẠI ====================
/**
 * Đặt lại toàn bộ hệ thống về trạng thái ban đầu
 */
function datLaiTatCa() {
    boNho = [{ batDau: 0, kichThuoc: TONG_RAM, tenTienTrinh: null }];
    danhSachTienTrinh = [];
    bangMau = {};
    chiSoMau = 0;
    thoiGianLog = 0;
    
    // Đặt lại thống kê
    Object.keys(thongKe).forEach(k => { 
        thongKe[k] = { soLanCapPhat: 0, soLanThatBai: 0, tongPhanManh: 0, soLanChup: 0 }; 
    });
    
    document.getElementById('than-nhat-ky').innerHTML = '<div class="dong-nhat-ky thong-tin"><span class="thoi-gian">00:00</span><span class="noi-dung">Hệ thống khởi động lại — RAM 1024 MB sẵn sàng.</span></div>';
    veLai();
}

// ==================== HÀM GHI LOG ====================
/**
 * Ghi log hoạt động
 * @param {string} tinNhan - Nội dung log
 * @param {string} loai - Loại log: 'thanh-cong', 'loi', 'thong-tin', 'can-bao'
 */
function ghiLog(tinNhan, loai) {
    thoiGianLog++;
    const phut = String(Math.floor(thoiGianLog / 60)).padStart(2, '0');
    const giay = String(thoiGianLog % 60).padStart(2, '0');
    
    const thanNhatKy = document.getElementById('than-nhat-ky');
    const dong = document.createElement('div');
    dong.className = `dong-nhat-ky ${loai}`;
    dong.innerHTML = `<span class="thoi-gian">${phut}:${giay}</span><span class="noi-dung">${tinNhan}</span>`;
    
    thanNhatKy.appendChild(dong);
    thanNhatKy.scrollTop = thanNhatKy.scrollHeight;
}

// ==================== HÀM VẼ GIAO DIỆN ====================
/**
 * Vẽ lại toàn bộ giao diện
 */
function veLai() {
    veThanhRAM();
    veDanhSachTienTrinh();
    capNhatThongKe();
    capNhatBangSoSanh();
    kiemTraNutDonDich();
    veThuocDo();
}

/**
 * Vẽ thanh RAM
 */
function veThanhRAM() {
    const thanhRam = document.getElementById('thanh-ram');
    thanhRam.innerHTML = '';
    
    boNho.forEach(khoi => {
        const phanTu = document.createElement('div');
        const phanTram = (khoi.kichThuoc / TONG_RAM * 100).toFixed(4);
        phanTu.style.width = phanTram + '%';
        phanTu.className = 'khoi-nho ' + (khoi.tenTienTrinh ? 'da-cap-phat' : 'trong');
        
        if (khoi.tenTienTrinh) {
            phanTu.style.background = bangMau[khoi.tenTienTrinh] || '#38bdf8';
            phanTu.setAttribute('data-tooltip', `${khoi.tenTienTrinh}: ${khoi.kichThuoc} MB @ ${khoi.batDau} MB`);
            
            if (parseFloat(phanTram) > 3) {
                const nhan = document.createElement('div');
                nhan.className = 'nhan-khoi-nho';
                nhan.textContent = parseFloat(phanTram) > 6 ? `${khoi.tenTienTrinh} (${khoi.kichThuoc}M)` : khoi.tenTienTrinh;
                phanTu.appendChild(nhan);
            }
        } else {
            phanTu.setAttribute('data-tooltip', `Trống: ${khoi.kichThuoc} MB @ ${khoi.batDau} MB`);
            
            if (parseFloat(phanTram) > 4) {
                const nhan = document.createElement('div');
                nhan.className = 'nhan-khoi-nho';
                nhan.style.color = 'rgba(255,255,255,0.25)';
                nhan.textContent = parseFloat(phanTram) > 7 ? `${khoi.kichThuoc}M` : '·';
                phanTu.appendChild(nhan);
            }
            
            // Thêm chỉ báo phân mảnh nếu có nhiều lỗ trống
            if (layLoTrong().length > 1) {
                const chiBao = document.createElement('div');
                chiBao.className = 'chi-bao-phan-manh';
                phanTu.appendChild(chiBao);
            }
        }
        thanhRam.appendChild(phanTu);
    });
}

/**
 * Vẽ thước đo địa chỉ
 */
function veThuocDo() {
    const thuocDo = document.getElementById('thuoc-do');
    thuocDo.innerHTML = '';
    
    [0, 256, 512, 768, 1024].forEach(mb => {
        const vach = document.createElement('div');
        vach.className = 'vach-thuoc';
        vach.style.left = (mb / TONG_RAM * 100) + '%';
        vach.textContent = mb + 'M';
        thuocDo.appendChild(vach);
    });
}

/**
 * Vẽ danh sách tiến trình
 */
function veDanhSachTienTrinh() {
    const danhSach = document.getElementById('danh-sach-tien-trinh');
    
    if (!danhSachTienTrinh.length) {
        danhSach.innerHTML = '<div class="trang-thai-trong">Chưa có tiến trình nào</div>';
        return;
    }
    
    danhSach.innerHTML = '';
    danhSachTienTrinh.forEach(t => {
        const phanTu = document.createElement('div');
        phanTu.className = 'muc-tien-trinh';
        phanTu.innerHTML = `
            <div class="cham-tien-trinh" style="background:${t.mau}"></div>
            <div class="ten-tien-trinh">${t.ten}</div>
            <div class="kich-thuoc-tien-trinh">${t.kichThuoc} MB</div>
            <div class="nut-giai-phong" onclick="giaiPhong('${t.ten}')">Free</div>
        `;
        danhSach.appendChild(phanTu);
    });
}

/**
 * Cập nhật các thông số thống kê
 */
function capNhatThongKe() {
    const daDung = danhSachTienTrinh.reduce((tong, t) => tong + t.kichThuoc, 0);
    const conTrong = TONG_RAM - daDung;
    const loTrong = layLoTrong();
    const phanManh = tinhPhanManh();
    const phanTramDaDung = (daDung / TONG_RAM * 100).toFixed(1);
    const phanTramPhanManh = phanManh.toFixed(1);

    document.getElementById('da-dung').textContent = daDung + ' MB';
    document.getElementById('thong-ke-da-dung').textContent = daDung + ' MB';
    document.getElementById('thong-ke-con-trong').textContent = conTrong + ' MB';
    document.getElementById('thong-ke-phan-manh').textContent = phanTramPhanManh + '%';
    document.getElementById('mo-ta-phan-manh').textContent = `Số lỗ trống: ${loTrong.length}`;
    document.getElementById('thong-ke-tien-trinh').textContent = danhSachTienTrinh.length;
    document.getElementById('phan-tram-da-dung').textContent = phanTramDaDung + '%';
    document.getElementById('phan-tram-phan-manh').textContent = phanTramPhanManh + '%';
    
    document.getElementById('thanh-da-dung').style.width = phanTramDaDung + '%';
    document.getElementById('thanh-phan-manh').style.width = Math.min(phanTramPhanManh * 2, 100) + '%';
}

/**
 * Cập nhật bảng so sánh thuật toán
 */
function capNhatBangSoSanh() {
    const maThuatToan = { first: 'ff', best: 'bf', worst: 'wf' };
    
    Object.entries(thongKe).forEach(([thuatToan, thongTin]) => {
        const ma = maThuatToan[thuatToan];
        const tong = thongTin.soLanCapPhat + thongTin.soLanThatBai;
        const tyLe = tong ? ((thongTin.soLanCapPhat / tong) * 100).toFixed(0) + '%' : '—';
        const trungBinhPhanManh = thongTin.soLanChup ? (thongTin.tongPhanManh / thongTin.soLanChup).toFixed(1) + '%' : '—';

        document.getElementById(`so-sanh-${ma}-cap-phat`).textContent = thongTin.soLanCapPhat;
        document.getElementById(`so-sanh-${ma}-ty-le`).textContent = tyLe;
        document.getElementById(`so-sanh-${ma}-phan-manh`).textContent = trungBinhPhanManh;

        const danhGia = document.getElementById(`so-sanh-${ma}-danh-gia`);
        if (thongTin.soLanChup === 0) {
            danhGia.textContent = '—';
            return;
        }
        
        const trungBinh = thongTin.tongPhanManh / thongTin.soLanChup;
        if (trungBinh < 5) {
            danhGia.textContent = '★ Tốt nhất';
            danhGia.className = 'tot';
        } else if (trungBinh < 15) {
            danhGia.textContent = '△ Trung bình';
            danhGia.className = 'trung-binh';
        } else {
            danhGia.textContent = '▽ Cao';
            danhGia.className = 'cao';
        }
    });
}

/**
 * Kiểm tra và cập nhật trạng thái nút dồn dịch
 */
function kiemTraNutDonDich() {
    const loTrong = layLoTrong();
    const coNhieuLoTrong = loTrong.length > 1;
    document.getElementById('nut-don-dich').disabled = !coNhieuLoTrong;
}

// ==================== KHỞI TẠO SỰ KIỆN ====================
// Xử lý phím Enter
document.getElementById('kich-thuoc').addEventListener('keydown', e => { 
    if (e.key === 'Enter') capPhat(); 
});

document.getElementById('ten-tien-trinh').addEventListener('keydown', e => { 
    if (e.key === 'Enter') document.getElementById('kich-thuoc').focus(); 
});

// Vẽ lần đầu
veLai();